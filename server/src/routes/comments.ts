
import { Router } from "express";
import { pool } from "../db/pool.js";

export const commentRouter = Router({mergeParams: true});

commentRouter.get("/", async (req, res) => {
  const {postId} = req.params as Record<string, string>;
  const [rows] = await pool.query(
    `SELECT c.id, c.user_id, c.content, c.created_at, u.name AS authorName
     FROM comments c JOIN users u ON c.user_id=u.id
     WHERE c.post_id=${postId}
     ORDER BY c.id`
  );
  res.json(rows);
});

commentRouter.post("/", async (req, res) => {
  // [R11-5] 비로그인 사용자의 댓글 작성 차단
  // 로그인 세션이 없으면 401 오류를 반환한다.
  if (!req.session.user) {
    return res.status(401).json({ message: "not logged in" });
  }

  const {postId} = req.params as Record<string, string>;
  const user = req.session.user as any;
  const {content} = req.body;

  await pool.query(
    `INSERT INTO comments(post_id, user_id, content)
     VALUES (${postId}, ${user?.id ?? 1}, '${content}')`
  );
  res.json({message: "created"});
});

commentRouter.delete("/:commentId", async (req, res) => {
  // [R11-5] 비로그인 사용자의 댓글 삭제 차단
  // 로그인 세션이 없으면 401 오류를 반환한다.
  if (!req.session.user) {
    return res.status(401).json({ message: "not logged in" });
  }

  const {commentId} = req.params as Record<string, string>;
  await pool.query(`DELETE FROM comments WHERE id=${commentId}`);
  res.json({message: "deleted"});
});
