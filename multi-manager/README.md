# Multi Manager 과제

관리자 전원이 승인해야 `TinyBank.setRewardPerBlock(uint256)`을 실행할 수 있는 학습용 Hardhat 프로젝트입니다.

## 실행

Node.js 22 LTS 환경을 권장합니다.

```sh
npm ci
npm test
```

테스트 파일에는 console.log가 없습니다. Solidity 0.8.28 컴파일러를 npm 패키지로 고정해 사용합니다.

## 구현 설명

- 생성자에서 3명 이상을 등록하며 중복 주소와 영 주소는 거절합니다.
- `confirm()`은 해당 회차에 한 번만 가능합니다.
- `approvedRound[address]`가 현재 `approvalRound`와 같으면 해당 관리자가 승인한 상태입니다.
- `confirmationCount`가 관리자 수와 같아야 `onlyAllConfirmed`를 통과합니다.
- 실행 시 회차를 증가시키고 승인 수를 0으로 바꿉니다. 모든 주소를 순회하며 승인 값을 지울 필요가 없습니다.
- 비관리자는 `require`로 `You are not a manager`, 승인 부족은 `Not all confirmed yet` 오류가 발생합니다.
- 함수 실행이 revert되면 회차 변경도 함께 취소됩니다.

## 테스트 항목

3명 등록, 인원 부족, 중복·영 주소, 비관리자 승인·변경 거절, 0~2명 승인 시 거절, 중복 승인 방지, 비관리자 실행 실패 후 승인 유지, 변경 후 재승인, 4명 전원 승인, 실제 보상 지급, 0원 예치 거절을 확인합니다.

## 참고 출처와 변경 범위

참고 저장소: https://github.com/ImmoC-hub/solidity-learning
확인한 커밋: 0b6f5d19b2f96b74ebc4f1af62d81f0c0e173279

`MyToken.sol`, `ManagedAccess.sol`은 참고 저장소의 코드를 사용했습니다. `TinyBank.sol`도 참고 코드 기반이며 보상률 조회를 public으로 열고 0원 예치 검사를 수정했습니다. `MultiManagedAccess.sol`, 테스트 및 실행 설정은 별도 작성했습니다. 참고 파일의 SPDX 표기는 유지했습니다. 참고 사실을 숨기는 용도가 아니며 수업의 코드 재사용·AI 사용 규정을 확인한 뒤 활용하세요.

이 과제의 승인은 특정 보상 금액에 묶이지 않습니다. 전원 승인 후 관리자 한 명이 전달하는 금액으로 변경됩니다. 또한 원본 은행의 보상 계산은 여러 예치자의 지분 변경이나 보상률 변경 이전 구간의 정산을 완전하게 처리하지 않습니다. 이 프로젝트는 다중 관리자 접근 제어를 검증하는 학습용이며 실제 자금 운용용이 아닙니다.

## GitHub 제출

본인 GitHub에서 빈 저장소를 만든 후 아래 명령의 URL을 본인 저장소 주소로 바꾸세요. 비밀번호나 개인 키를 소스에 넣지 마세요.

```sh
git init
git add .
git commit -m "Implement round-based unanimous manager approval and tests"
git branch -M main
git remote add origin https://github.com/YOUR_ID/YOUR_REPOSITORY.git
git push -u origin main
```

코드의 핵심은 “같은 관리자의 여러 번 승인이 다른 관리자의 승인을 대신할 수 없다”와 “실행 후에는 모두 다시 승인해야 한다”입니다. 제출 전 이 두 동작을 직접 실행하며 설명할 수 있는지 확인하세요.
