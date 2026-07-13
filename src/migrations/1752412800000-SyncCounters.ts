import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncCounters1752412800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = await queryRunner.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name LIKE '%voter%' AND table_type = 'BASE TABLE'
    `);

    if (tables.length > 0) {
      const voterTable: string = tables[0].table_name;
      const columns = await queryRunner.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = $1 ORDER BY ordinal_position
      `, [voterTable]);

      const colNames = columns.map((c: { column_name: string }) => c.column_name);
      const cardCol = colNames.find((c: string) => c.toLowerCase().includes('card'));
      const userCol = colNames.find((c: string) => c.toLowerCase().includes('user'));

      if (cardCol && userCol) {
        await queryRunner.query(`
          UPDATE cards
          SET "votesCount" = (
            SELECT COUNT(*)::int
            FROM "${voterTable}"
            WHERE "${voterTable}"."${cardCol}" = cards.id
          )
        `);
      }
    }

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
