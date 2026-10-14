import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A stay can never hold two active (PENDING / CONFIRMED) bookings whose dates overlap.
 * The service already checks this, but only the database can guarantee it when two requests arrive at the same time.
 * daterange(check_in, check_out) is half-open, so check-out day = next check-in day is allowed.
 */
export class PreventOverlappingBookings1791700000000 implements MigrationInterface {
	name = 'PreventOverlappingBookings1791700000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
		await queryRunner.query(
			`ALTER TABLE "bookings" ADD CONSTRAINT "excl_booking_overlap" EXCLUDE USING gist ("property_id" WITH =, daterange("check_in", "check_out") WITH &&) WHERE ("status" IN ('PENDING', 'CONFIRMED'))`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "bookings" DROP CONSTRAINT "excl_booking_overlap"`,
		);
	}
}
