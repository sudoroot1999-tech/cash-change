import { User } from "@exchange/common";

export interface UserPort {
    findById(id: string): Promise<User>;
    create({
        email,
        password,
        username,
        referralCode
    }: { email: string; password: string, username: string, referralCode?: string }): Promise<User>;
    validate( email: string, password: string ): Promise<User | null>;
    verifyPassword({ userId, password }: { userId: string; password: string }): Promise<{isValid:boolean}>;
    changePassword({ userId, currentPassword, newPassword }:{userId:string,currentPassword:string,newPassword:string}): Promise<string>;
    forgotPassword( email: string ): Promise<string>;
    resetPassword({ token, newPassword }: { token: string, newPassword:string}): Promise<string>;
}
