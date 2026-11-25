
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import "dotenv/config";

const schemaPath = path.join(process.cwd(), "..", "db", "schema.sql");
const uploadDir = path.join(process.cwd(), "uploads");

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "1234",
    multipleStatements: true
  });

  // [R11-6] 데이터베이스와 기본 시드 계정을 생성한다.
  await conn.query(fs.readFileSync(schemaPath, "utf8"));

  // [R11-6] 시드 계정의 비밀번호를 bcrypt로 해시 처리한다.
  // auth.ts의 로그인 검증 방식과 동일하게 bcrypt를 사용한다.
  const seedUsers = [
    {
      email: "admin@school.test",
      password: "admin1234"
    },
    {
      email: "student1@school.test",
      password: "student1234"
    },
    {
      email: "student2@school.test",
      password: "student1234"
    }
  ];

  // [R11-6] 각 시드 계정의 비밀번호를 bcrypt 해시로 저장한다.
  for (const seedUser of seedUsers) {
    const passwordHash = await bcrypt.hash(seedUser.password, 10);

    await conn.execute(
      "UPDATE users SET password_hash = ? WHERE email = ?",
      [passwordHash, seedUser.email]
    );
  }

  await conn.end();

  // 기존 업로드 폴더 초기화 기능 유지
  fs.rmSync(uploadDir, {recursive: true, force: true});
  console.log("DB와 uploads 폴더를 초기 상태로 되돌렸습니다.");
}

main().catch(err => {
  console.error("초기화 실패:", err.message);
  process.exit(1);
});
