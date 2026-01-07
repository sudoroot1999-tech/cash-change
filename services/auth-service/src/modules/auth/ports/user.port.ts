import { User } from "@exchange/common";

export interface UserPort {
    findById(id: string): Promise<User>;
    create({
        email,
        password,
        username,
        referral_code
    }: { email: string; password: string, username: string, referral_code?: string }): Promise<User>;
    validate( email: string, password: string ): Promise<User | null>;
    verifyPassword({ user_id, password }: { user_id: string; password: string }): Promise<{success:boolean}>;
    changePassword({ user_id, currentPassword, newPassword }:{user_id:string,currentPassword:string,newPassword:string}): Promise<{message:string,success:boolean}>;
    forgotPassword( email: string ): Promise<{message:string,success:boolean}>;
    resetPassword({ token, newPassword }:{token:string,newPassword:string}): Promise<{message:string,success:boolean}>;
}
