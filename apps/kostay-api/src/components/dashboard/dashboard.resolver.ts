import { Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AdminDashboard } from '../../libs/dto/dashboard/dashboard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberType } from '../../libs/enums/member.enum';

@Resolver()
export class DashboardResolver {
	constructor(private readonly dashboardService: DashboardService) {}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => AdminDashboard)
	public async getAdminDashboard(): Promise<AdminDashboard> {
		console.log('Query: getAdminDashboard');
		return await this.dashboardService.getAdminDashboard();
	}
}
