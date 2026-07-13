import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncCounters1752412800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE cards
      SET "votesCount" = (
        SELECT COUNT(*)::int
        FROM card_voters
        WHERE card_voters."cardId" = cards.id
      )
    `);

    await queryRunner.query(`
      UPDATE cards
      SET "commentsCount" = (
        SELECT COUNT(*)::int
        FROM comments
        WHERE comments."cardId" = cards.id
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE cards SET "votesCount" = 0`);
    await queryRunner.query(`UPDATE cards SET "commentsCount" = 0`);
  }
}
