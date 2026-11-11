import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObjectId } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { Property } from '../../libs/dto/property/property';

/** mongoose's ObjectId type declares no toString, so String(id) trips no-base-to-string. */
function toHexId(id: ObjectId): string {
	return (id as unknown as { toHexString(): string }).toHexString();
}

@Injectable()
export class AiSearchService {
	private readonly logger = new Logger(AiSearchService.name);
	private readonly baseUrl?: string;
	private readonly apiKey: string;

	constructor(
		private readonly http: HttpService,
		config: ConfigService,
	) {
		this.baseUrl = config.get<string>('AI_SEARCH_URL');
		this.apiKey = config.get<string>('AI_SEARCH_API_KEY') ?? '';
	}

	/** Fire-and-forget: never throws and never blocks the caller. Non-ACTIVE stays are removed by the AI service. */
	public syncProperty(property: Property): void {
		const id = toHexId(property._id);
		const body = {
			propertyTitle: property.propertyTitle,
			propertyDesc: property.propertyDesc,
			propertyAddress: property.propertyAddress,
			propertyLocation: property.propertyLocation,
			propertyType: property.propertyType,
			propertyStatus: property.propertyStatus,
			pricePerNight: property.pricePerNight,
			maxGuests: property.maxGuests,
			propertyRooms: property.propertyRooms,
			propertyBeds: property.propertyBeds,
			propertySquare: property.propertySquare,
			propertyRank: property.propertyRank,
		};
		this.send(id, () => this.http.put(this.url(id), body, this.options()));
	}

	public removeProperty(propertyId: ObjectId): void {
		const id = toHexId(propertyId);
		this.send(id, () => this.http.delete(this.url(id), this.options()));
	}

	private send(id: string, request: () => ReturnType<HttpService['put']>): void {
		if (!this.baseUrl) return;
		firstValueFrom(request()).catch((error: Error) =>
			this.logger.warn(`AI search sync failed for property ${id}: ${error.message}`),
		);
	}

	private url(propertyId: string): string {
		return `${this.baseUrl}/v1/index/properties/${propertyId}`;
	}

	private options() {
		return { headers: { 'X-Internal-Api-Key': this.apiKey } };
	}
}
