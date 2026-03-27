import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class LoginDto {
    @IsNotEmpty()
    @MinLength(3)
    @Transform(({value})=>value.trim().toLowerCase())
    username: string

    @IsNotEmpty()
    @IsString()
    @MinLength(8, {message: 'Password must be 8 characters long'})
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {message: 'Password must have 1 uppercase, 1 lowercase, 1 number, and 1 special character.'})
    password: string
}