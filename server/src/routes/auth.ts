
import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db/pool.js";

export const authRouter = Router();

// [R11-4] 계정별 로그인 실패 횟수 및 잠금 시간 관리
// 계정 이메일을 기준으로 실패 횟수와 잠금 종료 시간을 저장한다.
const loginAttempts = new Map<
  string,
  { count: number; lockedUntil: number }
>();

authRouter.post("/register", async (req, res) => {
  const { email, password, name } = req.body;

  // [R11-2] 비밀번호 최소 8자 검증
  // 비밀번호가 문자열이 아니거나 8자 미만이면 회원가입을 거부한다.
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({
      message: "비밀번호는 8자 이상이어야 합니다."
    });
  }

  // [R11-1] MD5 대신 bcrypt를 사용하여 비밀번호를 해시 처리한다.
  // 숫자 10은 bcrypt의 salt rounds 설정값이다.
  const passwordHash = await bcrypt.hash(password, 10);

  // [R11-1] SQL Injection 방지
  // 사용자 입력값을 SQL문에 직접 삽입하지 않고 ? 바인딩으로 전달한다.
  await pool.query(
    `INSERT INTO users(email, password_hash, name, role)
     VALUES (?, ?, ?, 'USER')`,
    [email, passwordHash, name]
  );

  res.json({ message: "registered" });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // [R11-4] 계정별 로그인 실패 기록을 구분하기 위한 키
  const accountKey =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  const now = Date.now();
  const attempt = loginAttempts.get(accountKey);

  // [R11-4] 잠금 상태 확인
  // 5회 실패로 잠금 시간이 남아 있으면 로그인 요청을 차단한다.
  if (attempt && attempt.lockedUntil > now) {
    return res.status(429).json({
      message: "로그인 시도가 제한되었습니다. 5분 후 다시 시도해 주세요."
    });
  }

  // [R11-4] 잠금 시간이 만료되면 실패 기록을 초기화한다.
// 실제 잠금 시간이 설정된 경우에만 만료 여부를 확인한다.
if (attempt && attempt.lockedUntil > 0 && attempt.lockedUntil <= now) {
  loginAttempts.delete(accountKey);
}

  // [R11-1] SQL Injection 방지
  // 이메일을 ? 바인딩으로 전달하여 SQL문과 입력값을 분리한다.
  const [rows]: any = await pool.query(
    `SELECT id, email, password_hash, name, role
     FROM users
     WHERE email = ?`,
    [email]
  );

  let isPasswordCorrect = false;

  // [R11-1] bcrypt.compare()로 입력 비밀번호와 저장된 해시를 비교한다.
  if (rows.length > 0 && typeof password === "string") {
    isPasswordCorrect = await bcrypt.compare(
      password,
      rows[0].password_hash
    );
  }

  // [R11-3] 로그인 실패 메시지 통일
  // 이메일이 없거나 비밀번호가 틀려도 같은 메시지를 반환한다.
  if (!isPasswordCorrect) {


    // [R11-4] 로그인 실패 횟수 증가
    const current = loginAttempts.get(accountKey) || {
      count: 0,
      lockedUntil: 0
    };

    current.count += 1;

    // [R11-4] 동일 계정으로 5회 연속 실패하면 5분간 잠근다.
    if (current.count >= 5) {
      current.lockedUntil = Date.now() + 5 * 60 * 1000;
      loginAttempts.set(accountKey, current);

      return res.status(429).json({
        message: "로그인 시도가 제한되었습니다. 5분 후 다시 시도해 주세요."
      });
    }

    loginAttempts.set(accountKey, current);

    // [R11-3] 이메일이나 비밀번호를 응답에 노출하지 않는다.
    return res.status(401).json({
      message: "이메일 또는 비밀번호가 올바르지 않습니다"
    });
  }

  // [R11-4] 로그인에 성공하면 해당 계정의 실패 횟수를 초기화한다.
  loginAttempts.delete(accountKey);

  const user = {
    id: rows[0].id,
    email: rows[0].email,
    name: rows[0].name,
    role: rows[0].role
  };

  req.session.user = user;
  res.cookie("lastLoginUser", JSON.stringify(user), { httpOnly: false });
  res.json(user);
});

authRouter.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "not logged in" });
  }

  res.json(req.session.user);
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "logout" }));
});
