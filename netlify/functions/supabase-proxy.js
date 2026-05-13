const { createClient } = require('@supabase/supabase-js');

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://istebul.com';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const profileFields = ['full_name', 'avatar_url', 'phone', 'location', 'bio'];
const listingFields = ['title', 'description', 'price', 'currency', 'location', 'images', 'category', 'status', 'tags', 'metadata', 'external_url'];

const json = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body)
});

const getSupabaseAdmin = () => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service is not configured');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
};

const getBearerToken = (headers = {}) => {
  const authHeader = headers.authorization || headers.Authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
};

const pick = (source = {}, fields = []) => fields.reduce((safe, field) => {
  if (Object.prototype.hasOwnProperty.call(source, field)) {
    safe[field] = source[field];
  }
  return safe;
}, {});

const sanitizeSearch = (value = '') => value
  .toString()
  .replace(/[%_,()]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 100);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
  if (!allowedMethods.includes(event.httpMethod)) {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const token = getBearerToken(event.headers);
    if (!token) {
      return json(401, { error: 'Authorization required' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json(401, { error: 'Invalid token' });
    }

    const path = event.path.replace('/.netlify/functions/supabase-proxy', '');
    const method = event.httpMethod;

    let body = {};
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }

    let result;

    switch (method) {
      case 'GET':
        if (path.startsWith('/listings')) {
          const listingId = path.replace('/listings', '').replace('/', '');
          if (listingId) {
            result = await supabase
              .from('listings')
              .select('*')
              .eq('id', listingId)
              .single();
          } else {
            const queryParams = event.queryStringParameters || {};
            let query = supabase
              .from('listings')
              .select('*')
              .eq('status', 'active')
              .order('created_at', { ascending: false });

            if (queryParams.category) {
              query = query.eq('category', queryParams.category);
            }

            const search = sanitizeSearch(queryParams.search);
            if (search) {
              query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
            }

            const limit = Math.min(parseInt(queryParams.limit || '20', 10), 50);
            result = await query.limit(Number.isFinite(limit) ? limit : 20);
          }
        } else if (path === '/profile') {
          result = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, phone, location, bio')
            .eq('id', user.id)
            .single();
        }
        break;

      case 'POST':
        if (path === '/listings') {
          result = await supabase
            .from('listings')
            .insert([{ ...pick(body, listingFields), user_id: user.id, status: 'active' }])
            .select()
            .single();
        }
        break;

      case 'PUT':
        if (path.startsWith('/listings/')) {
          const listingId = path.replace('/listings/', '');
          const { data: existingListing, error: lookupError } = await supabase
            .from('listings')
            .select('user_id')
            .eq('id', listingId)
            .single();

          if (lookupError || !existingListing) {
            return json(404, { error: 'Listing not found' });
          }

          if (existingListing.user_id !== user.id) {
            return json(403, { error: 'Not authorized' });
          }

          result = await supabase
            .from('listings')
            .update(pick(body, listingFields))
            .eq('id', listingId)
            .select()
            .single();
        } else if (path === '/profile') {
          result = await supabase
            .from('profiles')
            .update(pick(body, profileFields))
            .eq('id', user.id)
            .select('id, full_name, avatar_url, phone, location, bio')
            .single();
        }
        break;

      case 'DELETE':
        if (path.startsWith('/listings/')) {
          const listingId = path.replace('/listings/', '');
          const { data: existingListing, error: lookupError } = await supabase
            .from('listings')
            .select('user_id')
            .eq('id', listingId)
            .single();

          if (lookupError || !existingListing) {
            return json(404, { error: 'Listing not found' });
          }

          if (existingListing.user_id !== user.id) {
            return json(403, { error: 'Not authorized' });
          }

          result = await supabase
            .from('listings')
            .update({ status: 'deleted' })
            .eq('id', listingId);
        }
        break;
    }

    if (!result) {
      return json(404, { error: 'Endpoint not found' });
    }

    if (result.error) {
      console.error('Supabase error:', result.error);
      return json(500, { error: 'Database error' });
    }

    return json(200, { success: true, data: result.data });
  } catch (error) {
    console.error('Function error:', error);
    return json(500, { error: 'Internal server error' });
  }
};