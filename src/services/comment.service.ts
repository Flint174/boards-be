import { IsNull, Repository } from "typeorm";
import { AppDataSource } from "../config/database.js";
import { Comment } from "../entities/Comment.js";
import { Card } from "../entities/Card.js";
import { Board } from "../entities/Board.js";
import { User, UserRole } from "../entities/User.js";
import { ERRORS } from "../constants/errors.js";

export class CommentService {
  private commentRepository: Repository<Comment>;
  private cardRepository: Repository<Card>;
  private boardRepository: Repository<Board>;
  private userRepository: Repository<User>;

  constructor() {
    this.commentRepository = AppDataSource.getRepository(Comment);
    this.cardRepository = AppDataSource.getRepository(Card);
    this.boardRepository = AppDataSource.getRepository(Board);
    this.userRepository = AppDataSource.getRepository(User);
  }

  private async verifyCardAccess(cardId: number, userId: number): Promise<Card> {
    const card = await this.cardRepository.findOne({
      where: { id: cardId },
      relations: ["board", "board.room", "board.room.users"],
    });

    if (!card) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const isMember = card.board.room.users.some((u) => u.id === userId);
    if (!isMember) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    return card;
  }

  async createComment(
    userId: number,
    data: { content: string; cardId: number; parentId?: number },
  ) {
    const card = await this.verifyCardAccess(data.cardId, userId);

    if (data.parentId) {
      const parent = await this.commentRepository.findOne({
        where: { id: data.parentId, card: { id: data.cardId } },
      });

      if (!parent) {
        throw new Error(ERRORS.NOT_FOUND);
      }
    }

    const comment = this.commentRepository.create({
      content: data.content,
      card: { id: data.cardId },
      author: { id: userId },
      parent: data.parentId ? ({ id: data.parentId } as Comment) : null,
    });

    const saved = await this.commentRepository.save(comment);

    card.commentsCount = (card.commentsCount || 0) + 1;
    await this.cardRepository.save(card);

    const result = await this.commentRepository.findOne({
      where: { id: saved.id },
      relations: ["author", "parent"],
    });

    if (!result) {
      throw new Error(ERRORS.NOT_FOUND_AFTER_SAVE);
    }

    return result;
  }

  async getCommentsByCard(
    cardId: number,
    userId: number,
    params?: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 20 } = params ?? {};

    await this.verifyCardAccess(cardId, userId);

    const [items, total] = await this.commentRepository.findAndCount({
      where: { card: { id: cardId } },
      relations: ["author", "parent"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getCommentById(id: number, userId: number) {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ["author", "card", "card.board", "card.board.room", "card.board.room.users"],
    });

    if (!comment) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const isMember = comment.card.board.room.users.some((u) => u.id === userId);
    if (!isMember) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    return comment;
  }

  async updateComment(id: number, userId: number, data: { content: string }) {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ["author"],
    });

    if (!comment) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    if (comment.author.id !== userId) {
      throw new Error(ERRORS.ACCESS_DENIED);
    }

    comment.content = data.content;
    const saved = await this.commentRepository.save(comment);

    const result = await this.commentRepository.findOne({
      where: { id: saved.id },
      relations: ["author", "parent"],
    });

    if (!result) {
      throw new Error(ERRORS.NOT_FOUND_AFTER_SAVE);
    }

    return result;
  }

  async deleteComment(id: number, userId: number) {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: [
        "author",
        "card",
        "card.owner",
        "card.board",
        "card.board.owner",
        "card.board.room",
        "card.board.room.owner",
        "card.board.room.users",
      ],
    });

    if (!comment) {
      throw new Error(ERRORS.NOT_FOUND);
    }

    const isCommentOwner = comment.author.id === userId;
    const isCardOwner = comment.card.owner.id === userId;
    const isBoardOwner = comment.card.board.owner.id === userId;
    const isRoomOwner = comment.card.board.room.owner.id === userId;

    if (isCommentOwner || isCardOwner || isBoardOwner || isRoomOwner) {
      comment.card.commentsCount = Math.max(0, (comment.card.commentsCount || 0) - 1);
      await this.cardRepository.save(comment.card);
      return await this.commentRepository.remove(comment);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user?.role === UserRole.ADMIN) {
      comment.card.commentsCount = Math.max(0, (comment.card.commentsCount || 0) - 1);
      await this.cardRepository.save(comment.card);
      return await this.commentRepository.remove(comment);
    }

    throw new Error(ERRORS.ACCESS_DENIED);
  }
}
