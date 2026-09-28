import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @IsUUID() productId!: string;
  @IsInt() @Min(1) @Max(100) quantity!: number;
}

export class UpdateCartItemDto {
  @IsInt() @Min(1) @Max(100) quantity!: number;
}
