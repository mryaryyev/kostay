import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
	imports: [
		HttpModule,
		// registerAsync waits for ConfigModule, so SECRET_TOKEN is read after .env is loaded
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				secret: config.getOrThrow<string>('SECRET_TOKEN'),
				signOptions: { expiresIn: '30d' },
			}),
		}),
	],
	providers: [AuthService],
	exports: [AuthService],
})
export class AuthModule {}
