import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@app/common/kernel/Result';
import { USER_REPOSITORY, UserRepository } from '@app/modules/user/application/ports/UserRepository';
import { User } from '@app/modules/user/domain/User';
import { TelegramLoginPayload } from '../../domain/interfaces/TelegramLoginPayload';
import { TelegramLoginVerifier } from '../../domain/TelegramLoginVerifier';
import { InvalidTelegramLoginSignatureError } from '../../domain/errors/InvalidTelegramLoginSignatureError';
import { ExpiredTelegramLoginError } from '../../domain/errors/ExpiredTelegramLoginError';
import { TOKEN_ISSUER, TokenIssuer } from '../ports/TokenIssuer';

@Injectable()
export class LoginWithTelegramUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(TOKEN_ISSUER) private readonly tokenIssuer: TokenIssuer,
    private readonly botToken: string,
  ) {}

  async execute(
    payload: TelegramLoginPayload,
  ): Promise<Result<string, InvalidTelegramLoginSignatureError | ExpiredTelegramLoginError>> {
    const verifyResult = TelegramLoginVerifier.verify(payload, this.botToken);

    if (verifyResult.isFailure) {
      return Result.fail(verifyResult.error);
    }

    const existingUser = await this.userRepository.findByTelegramUserId(payload.id);
    const user = existingUser
      ? existingUser.updateTelegramUsername(payload.username ?? null)
      : User.create({ telegramUserId: payload.id, telegramUsername: payload.username });

    await this.userRepository.save(user);

    const token = this.tokenIssuer.issue(user.id);

    return Result.ok(token);
  }
}
