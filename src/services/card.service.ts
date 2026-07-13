import { Repository } from "typeorm";
import { AppDataSource } from "../config/database.js";
import { Card, CardStatus } from "../entities/Card.js";
import { Board } from "../entities/Board.js";
import { User, UserRole } from "../entities/User.js";
import { ERRORS } from "../constants/errors.js";
import type { CardSort, CardSortOrder } from "../schemas/card.schema.js";
import { PAGINATION } from "../constants/pagination.js";

export class CardService {
  private cardRepository: Repository<Card>;
  private boardRepository: Repository<Board>;
  private userRepository: Repository<User>;

  constructor() {
    this.cardRepository = AppDataSource.getRepository(Card);
    this.boardRepository = AppDataSource.getRepository(Board);
    this.userRepository = AppDataSource.getRepository(User);
  }

  async createCard(
    ownerId: number,
    data: {
      title: string;
      description?: string;
      boardId: number;
    },
  ) {
    const board = await this.boardRepository.findOne({
      where: { id: data.boardId },
      relations: ["room", "room.users"],
    });

    if (!board) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const isMember = board.room.users.some((u) => u.id === ownerId);
    if (!isMember) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    const card = this.cardRepository.create({
      title: data.title,
      description: data.description,
      board: { id: data.boardId },
      owner: { id: ownerId },
    });

    const savedCard = await this.cardRepository.save(card);

    const saved = await this.cardRepository.findOne({
      where: { id: savedCard.id },
      relations: ["owner"],
    });

    if (!saved) {
      throw new Error(ERRORS.NOT_FOUND_AFTER_SAVE);
    }

    return saved;
  }

  async getCardsByBoard(
    boardId: number,
    userId: number,
    options?: {
      sort?: CardSort;
      sortOrder?: CardSortOrder;
      status?: CardStatus;
      page?: number;
      limit?: number;
    },
  ) {
    const { page = PAGINATION.PAGE, limit = PAGINATION.LIMIT } = options ?? {};

    const board = await this.boardRepository.findOne({
      where: { id: boardId },
      relations: ["room", "room.users"],
    });

    if (!board) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const isMember = board.room.users.some((u) => u.id === userId);
    if (!isMember) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    const where: Record<string, unknown> = { board: { id: boardId } };
    if (options?.status) {
      where.status = options.status;
    }

    let order: Record<string, string> = { createdAt: "DESC" };
    if (options?.sort) {
      const dir = options.sortOrder || "DESC";
      switch (options.sort) {
        case "votes":
          order = { votesCount: dir };
          break;
        case "date":
          order = { createdAt: dir };
          break;
        case "comments":
          order = { commentsCount: dir };
          break;
        case "alphabet":
          order = { title: dir === "DESC" ? "DESC" : "ASC" };
          break;
      }
    }

    const [items, total] = await this.cardRepository.findAndCount({
      where,
      order,
      relations: ["owner"],
      skip: (page - 1) * limit,
      take: limit,
    });

    let votedIds = new Set<number>();
    if (items.length > 0) {
      const votedCards = await this.cardRepository
        .createQueryBuilder("card")
        .innerJoin("card.voters", "voter", "voter.id = :userId", { userId })
        .select("card.id")
        .where("card.id IN (:...ids)", { ids: items.map((i) => i.id) })
        .getMany();
      votedIds = new Set(votedCards.map((c) => c.id));
    }

    const itemsWithVoted = items.map((item) => ({
      ...item,
      voted: votedIds.has(item.id),
    }));

    return { items: itemsWithVoted, total, page, limit };
  }

  async getCardById(id: number, userId: number) {
    const card = await this.cardRepository.findOne({
      where: { id },
      relations: ["owner", "board", "board.room", "board.room.users", "voters"],
    });

    if (!card) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const isMember = card.board.room.users.some((u) => u.id === userId);
    if (!isMember) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    const voted = card.voters.some((v) => v.id === userId);

    return { ...card, voted };
  }

  async updateCard(id: number, userId: number, data: Partial<Card>) {
    const card = await this.cardRepository.findOne({
      where: { id },
      relations: ["owner", "board", "board.room", "board.room.users"],
    });

    if (!card) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const isMember = card.board.room.users.some((u) => u.id === userId);
    if (!isMember) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    if (card.owner.id !== userId) {
      throw new Error(ERRORS.ONLY_OWNER_CAN_EDIT);
    }

    Object.assign(card, data);
    return await this.cardRepository.save(card);
  }

  async deleteCard(id: number, userId: number) {
    const card = await this.cardRepository.findOne({
      where: { id },
      relations: [
        "owner",
        "board",
        "board.owner",
        "board.room",
        "board.room.owner",
        "board.room.users",
      ],
    });

    if (!card) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const isCardOwner = card.owner.id === userId;
    const isBoardOwner = card.board.owner.id === userId;
    const isRoomOwner = card.board.room.owner.id === userId;

    if (isCardOwner || isBoardOwner || isRoomOwner) {
      return await this.cardRepository.remove(card);
    }

    // Check if user is admin
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user?.role === UserRole.ADMIN) {
      return await this.cardRepository.remove(card);
    }

    throw new Error(ERRORS.ACCESS_DENIED);
  }

  async voteCard(cardId: number, userId: number) {
    const card = await this.cardRepository.findOne({
      where: { id: cardId },
      relations: ["voters", "board", "board.room", "board.room.users"],
    });

    if (!card) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const isMember = card.board.room.users.some((u) => u.id === userId);
    if (!isMember) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    const hasVoted = card.voters.some((v) => v.id === userId);

    if (hasVoted) {
      card.voters = card.voters.filter((v) => v.id !== userId);
      card.votesCount = Math.max(0, card.votesCount - 1);
    } else {
      card.voters.push({ id: userId } as User);
      card.votesCount = (card.votesCount || 0) + 1;
    }

    await this.cardRepository.save(card);

    return {
      votesCount: card.votesCount,
      voted: !hasVoted,
    };
  }
}
