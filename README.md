# LINGUAGUARD

**Learn English. Think in Context. Master Language.**

LINGUAGUARD is a responsive web-based quiz platform for **Grade 8 learners** that focuses on *contextual identification of parts of speech*. Each question shows a real sentence with one highlighted word; the learner decides how that word is used and picks one of four answers. Teachers (admins) manage a question bank, build quizzes, share quiz codes and monitor results.

---

## Features

### Learners
- Register / log in (public registration always creates a **learner** account)
- Dashboard: welcome, available quizzes, average score, completed and passed quizzes, recent attempts
- **Join Quiz** with a code (e.g. `LG6ME5`) → quiz instructions → **START QUIZ**
- Quiz screen: question number, progress bar, question navigator, countdown timer, sentence with highlighted target word, four touch-friendly answer tiles, Previous / Next / Submit / Finish
- Immediate feedback (Correct! / Incorrect, the correct answer and an explanation) after each answer
- Results: score X / Y, percentage, PASSED / NEEDS IMPROVEMENT, correct and incorrect counts, time taken, full question review
- Quiz history (own attempts only), resume an unfinished attempt, retry when the quiz allows it
- Profile and password change

### Teacher / Admin
- Dashboard: total learners, questions, quizzes, active quizzes, attempts, average score, performance overview, recent attempts / questions / quizzes
- **Question bank**: search, filter by category and difficulty, pagination, add / edit / view / delete (with confirmation)
- **Quiz management**: search and filter, create / edit / view / delete (with confirmation), activate / deactivate, copy or regenerate the quiz code, time limit, passing score, randomize questions, randomize choices, allow retry
- **Question assignment**: pick questions from the bank, remove, reorder, see the selected count; duplicates are prevented
- **Results**: search, filter by quiz / learner / status, detailed result (learner, quiz, score, percentage, answers, correct and incorrect, completion time)
- **Performance monitoring** (scores and results only): total attempts, average, highest, lowest, passed, failed, pass rate, recent performance

### Security and integrity
- Role-based access (`role` column): learners get a 403 page on admin URLs and admins on learner URLs
- Passwords hashed with bcrypt; sessions regenerated on login and invalidated on logout; CSRF protection; login rate limiting
- **All scoring happens on the server.** The browser only sends `question_id` + `selected_answer`; `is_correct`, `score`, `percentage` and `status` are never accepted from the client
- Unanswered questions never expose their correct answer; the answer and explanation are sent only after the learner has answered that question
- One answer per question per attempt (validated + the `unique_attempt_question` index)
- Answers must belong to the attempt's quiz; attempts can only be read or changed by their owner
- **Server-side timer**: the deadline is `started_at + time_limit`. Late answers are rejected, overdue attempts are finalized as `timed_out` (whenever the attempt or any results list is opened), and the browser countdown is only a display
- Questions with recorded answers and quizzes with attempts cannot be deleted (to protect learner results). Deactivate the quiz instead

---

## Technology stack

| Layer | Technology |
|---|---|
| Backend | Laravel 12, PHP 8.2+ (works on XAMPP's PHP 8.2; 8.3+ recommended), Eloquent, Form Requests, middleware |
| Frontend | React 19, Inertia.js 3, Vite 7, Tailwind CSS 4, Lucide React |
| Database | Existing MySQL / MariaDB database `linguaguard_db` (XAMPP) |

There is no separate Node backend and no Firebase. Laravel serves everything, and React is rendered through Inertia.

---

## Requirements

- XAMPP with MySQL/MariaDB running (PHP ≥ 8.2 with `pdo_mysql`, `mbstring`, `fileinfo`; `pdo_sqlite` for tests)
- Composer 2
- Node.js 20+ and npm

---

## Installation

```bash
cd C:\xampp\htdocs\linguaguard
composer install
npm install
copy .env.example .env      # only if .env does not exist yet
php artisan key:generate    # only if APP_KEY is empty
npm run build
```

## Database configuration

`.env` must point at the **existing** database:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=linguaguard_db
DB_USERNAME=root
DB_PASSWORD=

SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
INERTIA_SSR_ENABLED=false
```

Sessions and cache use files, so **no extra tables are needed** in `linguaguard_db`.

## Existing database information

`linguaguard_db` (created in phpMyAdmin) is the source of truth. The app uses its six tables as they are:

| Table | Purpose |
|---|---|
| `users` | accounts, `role` = `admin` / `learner` |
| `questions` | question bank (`correct_answer` A–D, 8 categories, Easy/Medium/Hard) |
| `quizzes` | quiz settings and unique `quiz_code` |
| `quiz_questions` | quiz ↔ question links with `question_order` |
| `quiz_attempts` | one row per learner attempt (`in_progress` / `completed` / `timed_out`) |
| `quiz_answers` | one row per question per attempt (blank rows store skipped questions) |

**Migrations:** `database/migrations/2026_10_02_000001_create_linguaguard_schema.php` documents this schema. Every table in it is created *only if it does not exist*, and `down()` is intentionally empty. Running `php artisan migrate` against the live database is therefore safe (it only adds Laravel's `migrations` bookkeeping table), but it is **not required**: the app runs without it.

> ⚠️ Never run `php artisan migrate:fresh`, `migrate:reset`, `db:wipe` or similar destructive commands against `linguaguard_db`.

**Seeder (optional, idempotent):** `php artisan db:seed` inserts only what is missing. It skips existing users and the 8 starter questions, and creates the demo quiz **"Parts of Speech Starter Quiz"** if no quiz with that title exists. It has already been run once, which created that quiz with code **`LG6ME5`**.

---

## Running the application

Two terminals:

```bash
php artisan serve        # http://127.0.0.1:8000
npm run dev              # Vite dev server with hot reload
```

Or build the assets once (`npm run build`) and run only `php artisan serve`.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin / Teacher | `admin@linguaguard.test` | `Admin@12345` |
| Learner | `learner1@linguaguard.test` (Juan Dela Cruz) | `Learner@12345` |
| Learner | `learner2@linguaguard.test` (Maria Santos) | `Learner@12345` |
| Learner | `learner3@linguaguard.test` (Mark Reyes) | `Learner@12345` |

The original SQL import stored truncated (invalid) password hashes for these accounts, so nobody could log in. Their passwords were reset to the values above. Change them from the **Profile** page, or with:

```bash
php artisan linguaguard:set-password admin@linguaguard.test
```

New learners can also sign up at `/register`.

On an **empty** database the seeder creates `admin@linguaguard.test` / `Admin@12345` and `learner1@linguaguard.test` / `Learner@12345`.

---

## Testing

```bash
php artisan test
```

The tests use an **in-memory SQLite database** (see `phpunit.xml`), so they never touch `linguaguard_db`. There are 65 feature tests covering:

- **Authentication:** admin/learner login redirects, invalid login message, rate limiting, logout, registration (always a learner), profile and password change
- **Access control:** guests are redirected, learners get 403 on every admin page and action, admins are kept out of learner routes, friendly 404 page, no password in page props
- **Question bank:** add, validation (including "target word must appear in the sentence" and unique choices), edit, delete, protected delete, search, filters, pagination
- **Quizzes:** create with a generated unique code, the client cannot set the code, validation, duplicate questions rejected, ordering, reorder/remove, activate/deactivate, regenerate code, safe delete, search/filter
- **Quiz flow:** join (valid / not found / inactive / no questions / retry disabled), start, resume, attempt numbering, no answer leakage, server-side correctness, forged score ignored, duplicate answers, foreign questions, invalid choices, ownership, scoring and saved results, the result page only after finishing, timer expiry (late answers rejected, `timed_out`, early "timeout" requests ignored), stable randomization, history isolation, dashboard and admin statistics

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Pages hang or "connection refused" from MySQL | Start MySQL in the XAMPP Control Panel. If MariaDB starts but never reports *ready for connections* in `mysql\data\mysql_error.log`, a corrupted `multi-master.info` / `master-*.info` / `relay-log-*` set in `C:\xampp\mysql\data` is the usual cause. Stop MySQL, move those files out of the folder, and start it again. (This happened during development; the files were moved to `C:\xampp\mysql\replication_backup_20261002`.) |
| `Vite manifest not found` | Run `npm run build` (or keep `npm run dev` running) |
| Styles or scripts not updating | Hard refresh; restart `npm run dev`; run `php artisan optimize:clear` |
| `419 Page Expired` | The session expired. Reload the page and try again |
| Old config after editing `.env` | `php artisan config:clear` |
| Forgot a password | `php artisan linguaguard:set-password <email>` |

---

## Production considerations

- Set `APP_ENV=production`, `APP_DEBUG=false`, and a real `APP_URL`; run over HTTPS and set `SESSION_SECURE_COOKIE=true`
- Use a dedicated MySQL user with a password instead of `root`
- Run `composer install --no-dev --optimize-autoloader`, `npm run build`, `php artisan config:cache route:cache view:cache`
- Point the web server document root at `public/`
- Back up `linguaguard_db` regularly
- Overdue attempts are finalized on demand (when an attempt or results page is opened), so no scheduler or queue worker is needed
