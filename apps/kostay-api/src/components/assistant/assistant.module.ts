import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '../../schemas/Member.model';
import PropertySchema from '../../schemas/Property.model';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

@Module({
	imports: [
		HttpModule,
		ConfigModule,
		MongooseModule.forFeature([
			{ name: 'Property', schema: PropertySchema },
			{ name: 'Member', schema: MemberSchema },
		]),
	],
	controllers: [AssistantController],
	providers: [AssistantService],
})
export class AssistantModule {}
