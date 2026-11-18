
import { Router } from "express";
import { pool } from "../db/pool.js";

export const postRouter = Router();

postRouter.get("/", async (req, res) => {//게시글 검색 *입력값 검증 미흡 수정
  //<기존코드> const q = String(req.query.q ?? "");

  //#<수정 코드>
  // 검색어는 외부입력이므로 실제 문자열인지 확인한다.
// 문자열이 아니거나 50자를 초과하면 400 오류를 반환한다.
  
const raw = req.query.q; //검색어 가져오기 req.query.q	사용자가 URL로 전달한 검색어
// URL로 전달된 검색어 q를 가져온다.
if (raw !== undefined && typeof raw !== "string") {
  return res.status(400).json({ message: "q must be a string" });
} //사용자가 입력한 값이 존재하고 문자열이 아니라면 참


 // [입력값 검증]
  // 검색어가 문자열이 아닌 경우 400 오류 반환
const q = raw ?? ""; //??	왼쪽 값이 null 또는 undefined면 오른쪽 값을 사용한다
//raw 검색어가 존재하면 q에 저장 없으면 "" q에 저장


// [입력값 검증]
  // 검색어가 50자를 초과하면 요청 거부
if (q.length > 50) {
  return res.status(400).json({ message: "q is too long" });
}
//#

/* 기존 코드
  const [rows] = await pool.query(
    `SELECT p.id, p.user_id, p.title, p.content, p.created_at, u.name AS authorName
     FROM posts p JOIN users u ON p.user_id=u.id
     WHERE p.title LIKE '%${q}%' >>> q가 sql문에 직접 들어가서 조건 바꾸기가능
     ORDER BY p.id DESC`
  );
  res.json(rows);
});
*/

//#수정 코드
// [SQL Injection 취약점 개선]
// 기존에는 사용자 검색어를 SQL문에 직접 삽입하여
// 공격자가 SQL 조건을 조작할 수 있었다.
// 이를 방지하기 위해 ? 바인딩으로 SQL문과 입력값을 분리한다.
const [rows] = await pool.execute( 
  `SELECT p.id, p.user_id, p.title, p.content,
          p.created_at, u.name AS authorName
   FROM posts p JOIN users u ON p.user_id=u.id
   WHERE p.title LIKE ? 
   ORDER BY p.id DESC`,
  [`%${q}%`]
  //LIKE 특정 문자열 포함되거나 지정한 패턴과 일치하는 데이터를 검색할 때
  //FROM posts p JOIN post post 별칭 p 지정
  // 검색어를 ?자리에 받는다 
  //` ` → 백틱. 문자열 안에 변수를 넣을 수 있는 기호 
  //const q = "사과";

  //`%${q}%` = %사과% > 사과가 포함된 글
);

// 검색 결과를 JSON 형식으로 반환
res.json(rows);

// 게시글 검색 라우터 종료
});

//#
postRouter.get("/:id", async (req, res) => {//게시글 상세 조회
    // [R10-2] 게시글 ID는 양의 정수만 허용한다.
  // URL에서 게시글 ID 가져오기
  const rawId = req.params.id;
  const postId = Number(rawId);

  // 숫자가 아니거나 0, 음수, 소수이면 400 오류 반환
  if (
    !/^[1-9]\d*$/.test(rawId) ||
    !Number.isSafeInteger(postId)
  ) {
    return res.status(400).json({ message: "Invalid post id" });
  }
    // [SQL Injection 방어]
    // 게시글 ID를 SQL문에 직접 삽입하지 않고 ? 바인딩 사용
    const [rows]: any = await pool.execute(
    `SELECT p.*, u.name AS authorName
     FROM posts p JOIN users u ON p.user_id=u.id
     WHERE p.id=?`,
    [postId]
  );
  if (rows.length === 0) return res.status(404).json({message:"not found"});

    // [첨부파일 조회]
// 해당 게시글에 등록된 첨부파일 정보 가져오기

// [SQL Injection 방어]
// postId를 ?에 바인딩하여 SQL문과 사용자 입력값 분리
    const [attachments] = await pool.execute(
    `SELECT id, original_name, stored_name, size
     FROM attachments WHERE post_id=?`,
    [postId]
  );
  res.json({...rows[0], attachments});
});

postRouter.post("/", async (req, res) => {
  const user = req.session.user as any;
  const {title, content, userId} = req.body;

    // [게시글 등록]
// 제목, 내용, 작성자 ID를 데이터베이스에 저장

// [SQL Injection 방어]
// 사용자 입력값을 SQL문에 직접 넣지 않고 ? 바인딩 사용
    const [result]: any = await pool.execute(
    `INSERT INTO posts(user_id, title, content)
     VALUES (?, ?, ?)`,
    [userId ?? user?.id ?? 1, title, content]
  );
  res.json({message: "created", id: result.insertId});
});

postRouter.put("/:id", async (req, res) => {
  // 게시글 ID 검증
  const rawId = req.params.id;
  const postId = Number(rawId);

  if (
    !/^[1-9]\d*$/.test(rawId) ||
    !Number.isSafeInteger(postId)
  ) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  const {title, content} = req.body;


  // [게시글 수정]
// 해당 게시글의 제목과 내용을 변경

// [SQL Injection 방어]
// 제목, 내용, 게시글 ID를 각각 ? 바인딩으로 전달
  await pool.execute(
    `UPDATE posts SET title=?, content=? WHERE id=?`,
    [title, content, postId]
  );

  res.json({message: "updated"});
});

postRouter.delete("/:id", async (req, res) => {

  // 게시글 ID 검증
  const rawId = req.params.id;
  const postId = Number(rawId);

  if (
    !/^[1-9]\d*$/.test(rawId) ||
    !Number.isSafeInteger(postId)
  ) {
    return res.status(400).json({ message: "Invalid post id" });
  }


  // [게시글 삭제]
// 지정한 ID의 게시글 삭제

// [SQL Injection 방어]
// 게시글 ID를 ? 바인딩으로 전달하여 SQL문 조작 방지
  await pool.execute(
    `DELETE FROM posts WHERE id=?`,
    [postId]
  );

  res.json({message: "deleted"});
});
