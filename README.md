# Solidity Learning

Hardhat와 TypeScript를 사용하는 블록체인프로그래밍 실습 저장소입니다.

## 과제: signer1에 의한 signer0 자산 이동

- 계약: `contracts/MyToken.sol`
- 테스트: `test/MyToken.ts`

`MyToken`을 signer0으로 배포하면 signer0에게 1 MT가 발행됩니다.
MT의 소수 자릿수는 18이며, 테스트에서는 `ethers.parseUnits`로 수량을 계산합니다.

핵심 테스트는 하나의 테스트 안에서 다음 순서를 모두 검증합니다.

1. **approve**: signer0이 signer1에게 0.3 MT의 이동 권한을 부여합니다.
2. **transferFrom**: `myToken.connect(signer1)`으로 signer1이 호출하여 signer0의 0.3 MT를 signer1 자신의 주소로 전송합니다.
3. **balance 확인**: signer0의 잔액이 0.7 MT, signer1의 잔액이 0.3 MT인지 확인합니다.

| 항목 | 배포 직후 | approve 후 | transferFrom 후 |
| --- | --- | --- | --- |
| signer0 잔액 | 1 MT | 1 MT | 0.7 MT |
| signer1 잔액 | 0 MT | 0 MT | 0.3 MT |
| signer0이 signer1에게 허용한 수량 | 0 MT | 0.3 MT | 0 MT |
| 전체 발행량 | 1 MT | 1 MT | 1 MT |

추가로 승인 없는 전송, 승인받지 않은 계정의 전송, 남은 승인량 초과,
잔액 부족이 거절되는지 확인합니다. 각 테스트는 `loadFixture`로 초기 상태를
복원하므로 다른 테스트의 실행 순서에 의존하지 않습니다.

이 계약은 수업용 예제이며, `transfer(amount, to)`와
`Approval(spender, amount)` 인터페이스를 사용합니다.

## 실행

```shell
npm ci
npm test
```

이번 과제 테스트만 실행하려면:

```shell
npx hardhat test test/MyToken.ts
```

기존 Hardhat 기본 실습의 `Lock` 계약, 테스트, Ignition 배포 모듈도 포함되어 있습니다.
