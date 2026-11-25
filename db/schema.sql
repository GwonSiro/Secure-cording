DROP DATABASE IF EXISTS secure_board;
CREATE DATABASE secure_board CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE secure_board;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE attachments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- [R11-6] 시드 계정 비밀번호를 bcrypt 해시로 저장한다.
INSERT INTO users(email,password_hash,name,role)
VALUES
('admin@school.test', '$2b$10$6sxkZnYci4.1wG0ZLqyyQuWw5nZKyhvXRx2Y6iolJleXy.IA4ByAK', '관리자', 'ADMIN'),
('student1@school.test', '$2b$10$O/bN6SCYcv/DBwkAlMBiZuJQ9CjMwOPv2fpp1yKUpKdn0dY4G4g7G', '학생1', 'USER'),
('student2@school.test', '$2b$10$G6QrjhMKhrSH2hJ9Via8I.IYa1Lykrq1RLy.DK.mhSdMuIQuKI6RS', '학생2', 'USER');

INSERT INTO posts(user_id,title,content)
VALUES
(2,'첫 번째 글','안녕하세요. 첫 게시물입니다.'),
(3,'HTML 테스트','<b>굵은 글씨</b>'),
(2,'팀 프로젝트 시작했습니다','9주차부터 이 게시판을 함께 고쳐 나갑니다.'),
(3,'과제 제출 질문','보고서는 PDF로 내면 되나요?'),
(1,'[공지] 게시판 이용 안내','서로 존중하는 게시판을 만들어 주세요.');

INSERT INTO comments(post_id,user_id,content)
VALUES
(4,1,'네, PDF로 제출하면 됩니다.'),
(1,3,'반갑습니다!'),
(3,3,'저희 팀도 시작했어요.');
