export interface Tag {
  id: string;
  created_at: string;
  step_id: number | string | null;
  question: string | null;
  possible_answer: string | null;
  tag: string | null;
  tag_definition: string | null;
}