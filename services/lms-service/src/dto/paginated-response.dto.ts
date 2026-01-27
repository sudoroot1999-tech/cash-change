import { Type } from '@nestjs/common';
import { Field, ObjectType, Int } from '@nestjs/graphql';

export interface IPaginatedResponse<T> {
  items: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

@ObjectType()
export class PaginationMeta {
  @Field(() => Int)
  totalItems: number;

  @Field(() => Int)
  itemCount: number;

  @Field(() => Int)
  itemsPerPage: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => Int)
  currentPage: number;
}

export function PaginatedResponse<T>(classRef: Type<T>): Type<IPaginatedResponse<T>> {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedResponseClass implements IPaginatedResponse<T> {
    @Field(() => [classRef])
    items: T[];

    @Field(() => PaginationMeta)
    meta: PaginationMeta;
  }
  return PaginatedResponseClass as Type<IPaginatedResponse<T>>;
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): IPaginatedResponse<T> {
  return {
    items,
    meta: {
      totalItems: total,
      itemCount: items.length,
      itemsPerPage: limit,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    },
  };
}
