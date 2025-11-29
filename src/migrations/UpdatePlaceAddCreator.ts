import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePlaceAddCreator1701234567890 implements MigrationInterface {
    name = 'UpdatePlaceAddCreator1701234567890'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "places" ADD "creator_id" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_places_creator_id" ON "places" ("creator_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_places_creator_id"`);
        await queryRunner.query(`ALTER TABLE "places" DROP COLUMN "creator_id"`);
    }
}