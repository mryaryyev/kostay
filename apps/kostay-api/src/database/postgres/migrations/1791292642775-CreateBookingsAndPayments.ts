import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingsAndPayments1791292642775 implements MigrationInterface {
	name = 'CreateBookingsAndPayments1791292642775';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TYPE "public"."bookings_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')`,
		);
		await queryRunner.query(
			`CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "property_id" character varying(24) NOT NULL, "member_id" character varying(24) NOT NULL, "check_in" date NOT NULL, "check_out" date NOT NULL, "guests_count" integer NOT NULL, "total_price" numeric(12,2) NOT NULL, "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "chk_booking_guests" CHECK ("guests_count" > 0), CONSTRAINT "chk_booking_dates" CHECK ("check_out" > "check_in"), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE INDEX "idx_availability" ON "bookings" ("property_id", "check_in", "check_out") `,
		);
		await queryRunner.query(
			`CREATE TYPE "public"."payments_status_enum" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')`,
		);
		await queryRunner.query(
			`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'KRW', "payment_method" character varying(50) NOT NULL, "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING', "paid_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE INDEX "idx_payments_booking_id" ON "payments" ("booking_id") `,
		);
		await queryRunner.query(
			`ALTER TABLE "payments" ADD CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "payments" DROP CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2"`,
		);
		await queryRunner.query(`DROP INDEX "public"."idx_payments_booking_id"`);
		await queryRunner.query(`DROP TABLE "payments"`);
		await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
		await queryRunner.query(`DROP INDEX "public"."idx_availability"`);
		await queryRunner.query(`DROP TABLE "bookings"`);
		await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
	}
}
