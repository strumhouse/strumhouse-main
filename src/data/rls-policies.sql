-- Function to setup categories policies
CREATE OR REPLACE FUNCTION setup_categories_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "Allow public read access" ON categories;
  DROP POLICY IF EXISTS "Allow authenticated insert" ON categories;
  DROP POLICY IF EXISTS "Allow authenticated update" ON categories;
  DROP POLICY IF EXISTS "Allow authenticated delete" ON categories;

  -- Create new policies
  CREATE POLICY "Allow public read access" 
    ON categories FOR SELECT 
    USING (true);

  CREATE POLICY "Allow authenticated insert" 
    ON categories FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

  CREATE POLICY "Allow authenticated update" 
    ON categories FOR UPDATE 
    USING (auth.role() = 'authenticated');

  CREATE POLICY "Allow authenticated delete" 
    ON categories FOR DELETE 
    USING (auth.role() = 'authenticated');
END;
$$;

-- Function to setup services policies
CREATE OR REPLACE FUNCTION setup_services_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "Allow public read access" ON services;
  DROP POLICY IF EXISTS "Allow authenticated insert" ON services;
  DROP POLICY IF EXISTS "Allow authenticated update" ON services;
  DROP POLICY IF EXISTS "Allow authenticated delete" ON services;

  -- Create new policies
  CREATE POLICY "Allow public read access" 
    ON services FOR SELECT 
    USING (true);

  CREATE POLICY "Allow authenticated insert" 
    ON services FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

  CREATE POLICY "Allow authenticated update" 
    ON services FOR UPDATE 
    USING (auth.role() = 'authenticated');

  CREATE POLICY "Allow authenticated delete" 
    ON services FOR DELETE 
    USING (auth.role() = 'authenticated');
END;
$$;

-- Function to setup add_ons policies
CREATE OR REPLACE FUNCTION setup_addons_policies()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "Allow public read access" ON add_ons;
  DROP POLICY IF EXISTS "Allow authenticated insert" ON add_ons;
  DROP POLICY IF EXISTS "Allow authenticated update" ON add_ons;
  DROP POLICY IF EXISTS "Allow authenticated delete" ON add_ons;

  -- Create new policies
  CREATE POLICY "Allow public read access" 
    ON add_ons FOR SELECT 
    USING (true);

  CREATE POLICY "Allow authenticated insert" 
    ON add_ons FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

  CREATE POLICY "Allow authenticated update" 
    ON add_ons FOR UPDATE 
    USING (auth.role() = 'authenticated');

  CREATE POLICY "Allow authenticated delete" 
    ON add_ons FOR DELETE 
    USING (auth.role() = 'authenticated');
END;
$$; 