
-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('tags_taxonomy', 'prospect_tags', 'playbooks', 'initiatives', 'initiative_prospects', 'task_queue')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes 
WHERE tablename IN ('tags_taxonomy', 'prospect_tags', 'playbooks', 'initiatives', 'initiative_prospects', 'task_queue')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('prospect_tags', 'playbooks', 'initiatives', 'initiative_prospects', 'task_queue')
ORDER BY tc.table_name;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('tags_taxonomy', 'prospect_tags', 'playbooks', 'initiatives', 'initiative_prospects', 'task_queue')
ORDER BY tablename, policyname;

SELECT category, COUNT(*) as tag_count
FROM public.tags_taxonomy
GROUP BY category
ORDER BY tag_count DESC;

DO $$
DECLARE
    test_client_id UUID;
    test_lead_id UUID;
    test_playbook_id UUID;
    test_initiative_id UUID;
BEGIN
    SELECT id INTO test_client_id FROM public.clients LIMIT 1;
    
    IF test_client_id IS NOT NULL THEN
        SELECT id INTO test_lead_id FROM public.leads WHERE company_id = (
            SELECT id FROM public.companies WHERE id = (
                SELECT company_id FROM public.clients WHERE id = test_client_id
            )
        ) LIMIT 1;
        
        IF test_lead_id IS NOT NULL THEN
            INSERT INTO public.playbooks (client_id, name, goal_description, ai_instructions_and_persona)
            VALUES (test_client_id, 'Test Playbook', 'Test goal', 'Test AI instructions')
            RETURNING id INTO test_playbook_id;
            
            INSERT INTO public.initiatives (client_id, playbook_id, name)
            VALUES (test_client_id, test_playbook_id, 'Test Initiative')
            RETURNING id INTO test_initiative_id;
            
            INSERT INTO public.prospect_tags (prospect_id, tag)
            SELECT test_lead_id, tag FROM public.tags_taxonomy LIMIT 3;
            
            INSERT INTO public.initiative_prospects (initiative_id, prospect_id)
            VALUES (test_initiative_id, test_lead_id);
            
            INSERT INTO public.task_queue (prospect_id, initiative_id, action_type, scheduled_for, ai_rationale)
            VALUES (test_lead_id, test_initiative_id, 'SMS', NOW() + INTERVAL '1 hour', 'Test AI rationale');
            
            RAISE NOTICE 'Test data insertion successful';
            
            DELETE FROM public.task_queue WHERE initiative_id = test_initiative_id;
            DELETE FROM public.initiative_prospects WHERE initiative_id = test_initiative_id;
            DELETE FROM public.prospect_tags WHERE prospect_id = test_lead_id;
            DELETE FROM public.initiatives WHERE id = test_initiative_id;
            DELETE FROM public.playbooks WHERE id = test_playbook_id;
            
            RAISE NOTICE 'Test data cleanup successful';
        ELSE
            RAISE NOTICE 'No test lead found for testing';
        END IF;
    ELSE
        RAISE NOTICE 'No test client found for testing';
    END IF;
END $$;

SELECT 'AI Decision Engine tables created successfully' as status;
