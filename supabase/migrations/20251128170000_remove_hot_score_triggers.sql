-- Remove triggers for hot_score automatic updates
-- Hot score will now be updated by scheduled functions instead of triggers
-- The calculation functions are kept for potential future use

-- Remove trigger for discussion hot_score
DROP TRIGGER IF EXISTS trg_update_discussion_hot_score ON public.discussion;

-- Remove trigger for copany hot_score
DROP TRIGGER IF EXISTS trg_update_copany_hot_score ON public.copany;

-- Note: The calculation functions (fn_calculate_hot_score and fn_calculate_copany_hot_score)
-- are kept in case they are needed for manual updates or other purposes

