import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import { Certificate } from '../../database/entities/certificate.entity';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationMeta } from '../../common/dto/paginated-response.dto';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class PaginatedCertificates {
  @Field(() => [Certificate])
  items: Certificate[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}

@Resolver(() => Certificate)
export class CertificateResolver {
  constructor(private readonly certificateService: CertificateService) {}

  @Mutation(() => Certificate)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async issueCertificate(@Args('input') issueDto: IssueCertificateDto): Promise<Certificate> {
    return this.certificateService.issue(issueDto);
  }

  @Query(() => PaginatedCertificates, { name: 'myCertificates' })
  @UseGuards(JwtAuthGuard)
  async getMyCertificates(
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
    @CurrentUser('userId') userId: string,
  ): Promise<PaginatedCertificates> {
    return this.certificateService.getUserCertificates(userId, { page, limit });
  }

  @Query(() => Certificate, { name: 'certificate' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<Certificate> {
    return this.certificateService.findOne(id);
  }

  @Query(() => Certificate, { name: 'verifyCertificate' })
  async verify(@Args('code') code: string): Promise<Certificate> {
    return this.certificateService.verify(code);
  }

  @Mutation(() => Certificate)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async revokeCertificate(
    @Args('id', { type: () => ID }) id: string,
    @Args('reason') reason: string,
  ): Promise<Certificate> {
    return this.certificateService.revoke(id, reason);
  }

  @Mutation(() => Certificate)
  @UseGuards(JwtAuthGuard)
  async shareOnLinkedIn(@Args('id', { type: () => ID }) id: string): Promise<Certificate> {
    return this.certificateService.shareOnLinkedIn(id);
  }
}
