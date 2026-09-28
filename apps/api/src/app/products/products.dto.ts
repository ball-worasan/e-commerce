import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class CreateProductDto {
  @IsString() @IsNotEmpty() @Length(1, 64) @Matches(/^[A-Za-z0-9._-]+$/) sku!: string;
  @IsString() @IsNotEmpty() @Length(1, 200) name!: string;
  @IsOptional() @IsString() description?: string;
  /** Integer minor currency units; never a floating point amount. */
  @IsInt() @Min(0) @Max(2_147_483_647) priceMinor!: number;
  @IsString() @Matches(/^[A-Z]{3}$/) currency!: string;
  @IsInt() @Min(0) stockQuantity!: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateProductDto {
  @IsOptional() @IsString() @IsNotEmpty() @Length(1, 64) @Matches(/^[A-Za-z0-9._-]+$/) sku?: string;
  @IsOptional() @IsString() @IsNotEmpty() @Length(1, 200) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) @Max(2_147_483_647) priceMinor?: number;
  @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsInt() @Min(0) stockQuantity?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
