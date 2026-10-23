CREATE TABLE `copies` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`condition` text,
	`location` text,
	`acquired_on` text,
	`acquired_from` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `copies_edition_id` ON `copies` (`edition_id`);--> statement-breakpoint
CREATE TABLE `credits` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text NOT NULL,
	`edition_id` text,
	`person_id` text NOT NULL,
	`role` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `credits_work_id` ON `credits` (`work_id`);--> statement-breakpoint
CREATE INDEX `credits_person_id` ON `credits` (`person_id`);--> statement-breakpoint
CREATE INDEX `credits_edition_id` ON `credits` (`edition_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `credits_unique_work_credit` ON `credits` (`work_id`,`person_id`,`role`) WHERE "credits"."edition_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `credits_unique_edition_credit` ON `credits` (`edition_id`,`person_id`,`role`) WHERE "credits"."edition_id" is not null;--> statement-breakpoint
CREATE TABLE `editions` (
	`id` text PRIMARY KEY NOT NULL,
	`work_id` text NOT NULL,
	`publisher` text,
	`year` integer,
	`barcode` text,
	`cover_key` text,
	`source` text NOT NULL,
	`source_ref` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `editions_work_id` ON `editions` (`work_id`);--> statement-breakpoint
CREATE INDEX `editions_barcode` ON `editions` (`barcode`);--> statement-breakpoint
CREATE TABLE `works` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`sort_title` text NOT NULL,
	`subtitle` text,
	`first_year` integer,
	`description` text,
	`expands_work_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`expands_work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `works_expands_work_id` ON `works` (`expands_work_id`);--> statement-breakpoint
CREATE INDEX `works_kind_sort_title` ON `works` (`kind`,`sort_title`);--> statement-breakpoint
CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`copy_id` text NOT NULL,
	`borrower` text NOT NULL,
	`lent_on` text NOT NULL,
	`due_on` text,
	`returned_on` text,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`copy_id`) REFERENCES `copies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `loans_one_open_per_copy` ON `loans` (`copy_id`) WHERE "loans"."returned_on" is null;--> statement-breakpoint
CREATE INDEX `loans_copy_id` ON `loans` (`copy_id`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `people_sort_name` ON `people` (`sort_name`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `book_editions` (
	`edition_id` text PRIMARY KEY NOT NULL,
	`isbn13` text,
	`isbn10` text,
	`genre` text NOT NULL,
	`binding` text NOT NULL,
	`page_count` integer,
	`language` text DEFAULT 'en' NOT NULL,
	`edition_statement` text,
	`series` text,
	`series_number` integer,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `book_editions_isbn13` ON `book_editions` (`isbn13`);--> statement-breakpoint
CREATE INDEX `book_editions_isbn10` ON `book_editions` (`isbn10`);--> statement-breakpoint
CREATE TABLE `record_copies` (
	`copy_id` text PRIMARY KEY NOT NULL,
	`media_grade` text,
	`sleeve_grade` text,
	FOREIGN KEY (`copy_id`) REFERENCES `copies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `record_editions` (
	`edition_id` text PRIMARY KEY NOT NULL,
	`catalogue_number` text,
	`format` text NOT NULL,
	`speed` integer DEFAULT 33 NOT NULL,
	`disc_count` integer DEFAULT 1 NOT NULL,
	`vinyl_colour` text DEFAULT 'black' NOT NULL,
	`pressing_country` text,
	`musicbrainz_release_id` text,
	`discogs_release_id` text,
	`genre` text NOT NULL,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`edition_id` text NOT NULL,
	`side` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`duration_seconds` integer,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_edition_side_position` ON `tracks` (`edition_id`,`side`,`position`);--> statement-breakpoint
CREATE TABLE `game_copies` (
	`copy_id` text PRIMARY KEY NOT NULL,
	`complete` integer DEFAULT true NOT NULL,
	`sleeved` integer DEFAULT false NOT NULL,
	`missing_notes` text,
	FOREIGN KEY (`copy_id`) REFERENCES `copies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_editions` (
	`edition_id` text PRIMARY KEY NOT NULL,
	`min_players` integer NOT NULL,
	`max_players` integer NOT NULL,
	`play_minutes` integer NOT NULL,
	`min_age` integer,
	`language` text DEFAULT 'en' NOT NULL,
	`bgg_id` integer,
	FOREIGN KEY (`edition_id`) REFERENCES `editions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `passkeys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`public_key` blob NOT NULL,
	`sign_count` integer NOT NULL,
	`transports` text,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `passkeys_user_id` ON `passkeys` (`user_id`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`key` text NOT NULL,
	`attempted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_attempts_key_attempted_at` ON `login_attempts` (`key`,`attempted_at`);--> statement-breakpoint
CREATE TABLE `work_tags` (
	`work_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`work_id`, `tag_id`),
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `work_tags_tag_id` ON `work_tags` (`tag_id`);