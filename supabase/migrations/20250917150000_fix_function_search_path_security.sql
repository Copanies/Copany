-- Fix Function Search Path Security Issues
-- This migration fixes all functions that have mutable search_path warnings
-- by setting search_path to empty string for security using ALTER FUNCTION

-- Issue and assignment related functions
alter function public.fn_log_issue_create() set search_path = '';
alter function public.fn_notify_on_issue_create() set search_path = '';
alter function public.fn_log_assignment_requested() set search_path = '';
alter function public.fn_log_assignment_request_status_change() set search_path = '';
alter function public.fn_auto_skip_other_assignment_requests() set search_path = '';
alter function public.fn_notify_on_assignment_request_insert() set search_path = '';
alter function public.fn_notify_on_assignment_request_update() set search_path = '';
alter function public.fn_set_issue_assignee_on_request_accepted() set search_path = '';
alter function public.fn_issue_assignment_request_touch_updated_at() set search_path = '';

-- Review related functions
alter function public.fn_log_review_requested() set search_path = '';
alter function public.fn_notify_on_review_approved() set search_path = '';
alter function public.fn_log_review_approved() set search_path = '';
alter function public.fn_notify_on_review_requested() set search_path = '';
alter function public.fn_issue_reviewer_touch_updated_at() set search_path = '';
alter function public.fn_add_owner_as_reviewer_on_in_review() set search_path = '';

-- Issue related functions
alter function public.fn_log_issue_update() set search_path = '';
alter function public.fn_notify_on_issue_comment() set search_path = '';
alter function public.fn_notify_on_issue_update() set search_path = '';

-- Star related functions
alter function public.fn_inc_copany_star_count() set search_path = '';
alter function public.fn_dec_copany_star_count() set search_path = '';
alter function public.fn_notify_on_copany_star() set search_path = '';

-- Utility functions
alter function public.set_updated_at() set search_path = '';

-- Discussion related functions (backup fixes)
alter function public.fn_create_default_discussion_labels(bigint, uuid) set search_path = '';
alter function public.fn_inc_discussion_vote_count() set search_path = '';
alter function public.fn_dec_discussion_vote_count() set search_path = '';
alter function public.fn_update_discussion_comment_count() set search_path = '';
alter function public.fn_trigger_create_default_discussion_labels() set search_path = '';
alter function public.update_discussion_comment_vote_count() set search_path = '';
alter function public.fn_notify_on_discussion_vote() set search_path = '';
alter function public.fn_notify_on_discussion_comment() set search_path = '';
alter function public.fn_notify_on_discussion_comment_vote() set search_path = '';
alter function public.fn_notify_on_discussion_create() set search_path = '';