-- Seed script: insert 0-3 random todos per day for the past year
-- Replace the user_id below with your actual Auth0 user ID (sub claim)

DO $$
DECLARE
  d DATE;
  num_todos INT;
  i INT;
  todo_id TEXT;
  ts TEXT;
  colors TEXT[] := ARRAY['red','orange','yellow','green','blue','purple','pink','gray'];
  titles TEXT[] := ARRAY[
    'Buy groceries','Walk the dog','Read a chapter','Reply to emails',
    'Clean the kitchen','Go for a run','Write journal','Call dentist',
    'Fix the bug','Review PR','Update docs','Plan the week',
    'Cook dinner','Water plants','Do laundry','Meditate',
    'Stretch routine','Organize desk','Pay bills','Schedule meeting',
    'Backup files','Learn something new','Prep lunch','Take vitamins',
    'Check calendar','Send invoice','Refactor code','Deploy changes',
    'Team standup','Write tests','Grocery list','Oil change',
    'Vacuum house','Mop floors','Sort recycling','Sharpen knives'
  ];
  user_id TEXT := 'YOUR_AUTH0_USER_ID_HERE';
BEGIN
  FOR d IN SELECT generate_series(
    CURRENT_DATE - INTERVAL '364 days',
    CURRENT_DATE,
    '1 day'
  )::date
  LOOP
    -- 0 to 3 todos per day (weighted: ~25% chance of 0)
    num_todos := floor(random() * 4)::int;

    FOR i IN 1..num_todos LOOP
      todo_id := gen_random_uuid()::text;
      ts := (d + (interval '8 hours') + (random() * interval '10 hours'))::text;

      INSERT INTO todos (
        id, title, completed, completed_at, scope, due_date, color,
        rollover_rule, user_id, created_at, updated_at,
        sync_status, version, sort_order
      ) VALUES (
        todo_id,
        titles[1 + floor(random() * array_length(titles, 1))::int],
        true,
        ts,
        'day',
        d::text,
        colors[1 + floor(random() * array_length(colors, 1))::int],
        'next-day',
        user_id,
        ts,
        ts,
        'synced',
        1,
        i
      );
    END LOOP;
  END LOOP;
END $$;
