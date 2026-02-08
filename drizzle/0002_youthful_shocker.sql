ALTER TABLE `events` ADD `is_recurring` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `recurrence_period` text;