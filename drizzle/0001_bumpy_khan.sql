CREATE TABLE `color_keywords` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keyword` text NOT NULL,
	`color` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `color_keywords_keyword_unique` ON `color_keywords` (`keyword`);