-- Local verification rollback only. Removes exactly the Inquiry Foundation objects.
BEGIN;

DROP TABLE public.inquiry_activities;
DROP TABLE public.inquiry_referrals;
DROP TABLE public.inquiries;
DROP TABLE public.inquiry_contacts;

DROP FUNCTION public.reject_inquiry_activity_mutation();
DROP FUNCTION public.guard_inquiry_referral_transition();
DROP FUNCTION public.guard_inquiry_status_transition();
DROP FUNCTION public.validate_inquiry_referral_target();
DROP FUNCTION public.set_inquiry_updated_at();
DROP FUNCTION public.inquiry_text_array_is_unique(text[]);

COMMIT;
