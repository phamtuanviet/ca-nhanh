/**
 * Tạo dữ liệu demo (07 P0-10): 1 admin, 2 chủ quán, 30 người làm, 6 quán, rồi fn_demo_reset(60, 2.000.000đ).
 * Chạy lại nhiều lần được: tài khoản và quán đã có thì cập nhật, không tạo trùng.
 *
 *   npm run seed                                  # đọc .env.local (Supabase cục bộ)
 *   SEED_ENV_FILE=.env.demo npm run seed          # dự án Supabase khác
 *
 * Cần: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, DEMO_PASSWORD.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { Database } from '../lib/database.types';
import { DEMO_ACCOUNTS } from '../lib/demo';

config({ path: process.env.SEED_ENV_FILE ?? '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const password = process.env.DEMO_PASSWORD;
if (!url || !secret || !password) {
  console.error('Thiếu NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY hoặc DEMO_PASSWORD.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('DEMO_PASSWORD cần tối thiểu 8 ký tự.');
  process.exit(1);
}

const db = createClient<Database>(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Role = Database['public']['Enums']['user_role'];
type Category = Database['public']['Enums']['shop_category'];

// ---------- Dữ liệu ----------

const OWNERS = [
  {
    email: DEMO_ACCOUNTS.owner.email,
    fullName: DEMO_ACCOUNTS.owner.fullName,
    avatar: 'lan',
    phone: '0912345678',
  },
  { email: 'long@demo.vn', fullName: 'Trần Quốc Long', avatar: 'long', phone: '0987001122' },
];

const WORKERS: [slug: string, fullName: string][] = [
  ['minh', DEMO_ACCOUNTS.worker_a.fullName],
  ['an', DEMO_ACCOUNTS.worker_b.fullName],
  ['bao', 'Lê Hoàng Bảo'],
  ['binh', 'Trần Ngọc Bình'],
  ['han', 'Đỗ Gia Hân'],
  ['huy', 'Vũ Đức Huy'],
  ['khoi', 'Bùi Minh Khôi'],
  ['kiem', 'Hoàng Văn Kiệm'],
  ['linh', 'Ngô Khánh Linh'],
  ['mai-anh', 'Đặng Mai Anh'],
  ['my', 'Trịnh Thảo My'],
  ['trang', 'Lý Thu Trang'],
  ['vy', 'Phan Tường Vy'],
  ['ha', 'Nguyễn Thu Hà'],
  ['hoa', 'Lê Thị Hoa'],
  ['hung', 'Trần Mạnh Hùng'],
  ['khanh', 'Đinh Quốc Khánh'],
  ['lam', 'Võ Tùng Lâm'],
  ['mai', 'Phạm Ngọc Mai'],
  ['nam', 'Hoàng Nhật Nam'],
  ['ngoc', 'Dương Bảo Ngọc'],
  ['phuc', 'Tạ Hồng Phúc'],
  ['quan', 'Mai Anh Quân'],
  ['quynh', 'Chu Diễm Quỳnh'],
  ['son', 'Lương Thanh Sơn'],
  ['tam', 'Kiều Minh Tâm'],
  ['thao', 'Hà Phương Thảo'],
  ['tuan', 'Cao Anh Tuấn'],
  ['uyen', 'Tô Phương Uyên'],
  ['yen', 'Lâm Hải Yến'],
];

const AVATARS = [
  'an',
  'bao',
  'binh',
  'han',
  'huy',
  'khoi',
  'kiem',
  'linh',
  'mai-anh',
  'minh',
  'my',
  'trang',
  'vy',
];
const SCHOOLS = [
  'ĐH Quốc gia Hà Nội',
  'ĐH Bách khoa Hà Nội',
  'ĐH Kinh tế Quốc dân',
  'ĐH Thương mại',
  'Học viện Báo chí và Tuyên truyền',
  'ĐH Sư phạm Hà Nội',
  'ĐH Ngoại thương',
];
const SKILL_SETS = [
  ['barista', 'server'],
  ['server', 'cashier'],
  ['kitchen_helper', 'dishwasher'],
  ['barista', 'cashier'],
  ['server', 'event_staff'],
  ['cashier', 'kitchen_helper'],
];

type ShopSeed = {
  owner: number;
  name: string;
  category: Category;
  address: string;
  district: string;
  lat: number;
  lng: number;
  cover: string;
  description: string;
};

const SHOPS: ShopSeed[] = [
  {
    owner: 0,
    name: 'Cà phê Góc Phố',
    category: 'cafe',
    address: '144 Xuân Thủy, Dịch Vọng Hậu',
    district: 'Cầu Giấy',
    lat: 21.0367,
    lng: 105.7826,
    cover: 'cafe-garden',
    description: 'Quán cà phê gần ĐH Quốc gia, đông khách giờ tan học và buổi tối.',
  },
  {
    owner: 0,
    name: 'Trà sữa Mây',
    category: 'milk_tea',
    address: '59 Trần Thái Tông, Dịch Vọng',
    district: 'Cầu Giấy',
    lat: 21.0331,
    lng: 105.7898,
    cover: 'cafe-saigon',
    description: 'Trà sữa và trà trái cây, cao điểm cuối tuần.',
  },
  {
    owner: 0,
    name: 'Cơm nhà Lan',
    category: 'restaurant',
    address: '25 Dịch Vọng Hậu',
    district: 'Cầu Giấy',
    lat: 21.031,
    lng: 105.784,
    cover: 'cafe-traditional',
    description: 'Cơm văn phòng buổi trưa, cần người phụ bếp và phục vụ.',
  },
  {
    owner: 1,
    name: 'Bánh mì Phố Huế',
    category: 'fast_food',
    address: '118 Phố Huế',
    district: 'Hai Bà Trưng',
    lat: 21.0122,
    lng: 105.8513,
    cover: 'banh-mi',
    description: 'Bánh mì và đồ uống mang đi, đông nhất buổi sáng.',
  },
  {
    owner: 1,
    name: 'Cà phê Lò Đúc',
    category: 'cafe',
    address: '45 Lò Đúc',
    district: 'Hai Bà Trưng',
    lat: 21.0145,
    lng: 105.8578,
    cover: 'cafe-traditional',
    description: 'Cà phê phong cách cũ, phục vụ cả ngày.',
  },
  {
    owner: 1,
    name: 'Bún chả Bà Triệu',
    category: 'restaurant',
    address: '160 Bà Triệu',
    district: 'Hai Bà Trưng',
    lat: 21.0115,
    lng: 105.849,
    cover: 'cafe-garden',
    description: 'Bún chả và nem, cao điểm giờ trưa.',
  },
];

// ---------- Tiện ích ----------

function asciiUpper(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase();
}

type Result<T> = { data: T; error: null } | { data: unknown; error: { message: string } };

function check<T>(label: string, result: Result<T>): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data as T;
}

async function existingUsers(): Promise<Map<string, string>> {
  const byEmail = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const user of data.users) if (user.email) byEmail.set(user.email.toLowerCase(), user.id);
    if (data.users.length < 1000) return byEmail;
  }
}

async function ensureUser(
  users: Map<string, string>,
  email: string,
  fullName: string,
  role: Exclude<Role, 'admin'>,
): Promise<string> {
  const metadata = { role, full_name: fullName };
  const id = users.get(email);
  if (id) {
    check(
      'updateUser',
      await db.auth.admin.updateUserById(id, { password, user_metadata: metadata }),
    );
    return id;
  }
  const data = check(
    `createUser ${email}`,
    await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    }),
  );
  users.set(email, data.user.id);
  return data.user.id;
}

async function onboard(
  id: string,
  role: Exclude<Role, 'admin'>,
  fullName: string,
  phone: string,
  dob?: string,
) {
  check(
    'fn_complete_onboarding',
    await db.rpc('fn_complete_onboarding', {
      p_actor: id,
      p_role: role,
      p_full_name: fullName,
      p_phone: phone,
      p_date_of_birth: dob,
    }),
  );
}

// ---------- Chạy ----------

async function main() {
  console.log(`Seed vào ${url}`);
  const users = await existingUsers();

  // Chủ quán
  const ownerIds: string[] = [];
  for (const owner of OWNERS) {
    const id = await ensureUser(users, owner.email, owner.fullName, 'shop_owner');
    await onboard(id, 'shop_owner', owner.fullName, owner.phone);
    check(
      'avatar',
      await db
        .from('profiles')
        .update({ avatar_url: `/avatars/${owner.avatar}.svg` })
        .eq('id', id),
    );
    ownerIds.push(id);
  }

  // Người làm
  for (const [i, [slug, fullName]] of WORKERS.entries()) {
    const email = `${slug.replace('-', '')}@demo.vn`;
    const id = await ensureUser(users, email, fullName, 'worker');
    const year = 2000 + (i % 8);
    const dob = `${year}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`;
    const phone = `09${String(10_000_000 + i * 7_919_191).slice(-8)}`;
    await onboard(id, 'worker', fullName, phone, dob);
    const avatar = AVATARS.includes(slug) ? slug : AVATARS[i % AVATARS.length];
    check(
      'avatar',
      await db
        .from('profiles')
        .update({ avatar_url: `/avatars/${avatar}.svg` })
        .eq('id', id),
    );
    const near = SHOPS[i % SHOPS.length];
    check(
      'worker_profiles',
      await db
        .from('worker_profiles')
        .update({
          school: SCHOOLS[i % SCHOOLS.length],
          skills: SKILL_SETS[i % SKILL_SETS.length],
          bio: 'Sinh viên năm cuối, rảnh buổi tối và cuối tuần.',
          home_location: `SRID=4326;POINT(${(near.lng + 0.004 * ((i % 5) - 2)).toFixed(5)} ${(near.lat + 0.003 * ((i % 3) - 1)).toFixed(5)})`,
          bank_bin: '970436',
          bank_account_no: `0011${String(1_234_567 + i * 104_729).padStart(9, '0')}`,
          bank_account_name: asciiUpper(fullName),
        })
        .eq('user_id', id),
    );
  }

  // Admin: tạo như người dùng thường rồi nâng quyền (metadata role=admin luôn bị bỏ qua)
  const adminEmail = DEMO_ACCOUNTS.admin.email;
  const adminId = await ensureUser(users, adminEmail, DEMO_ACCOUNTS.admin.fullName, 'worker');
  check(
    'admin',
    await db
      .from('profiles')
      .update({
        role: 'admin',
        onboarded_at: new Date().toISOString(),
        avatar_url: '/avatars/kiet.svg',
      })
      .eq('id', adminId),
  );

  // Quán: cập nhật nếu đã có (cùng chủ, cùng tên), không thì tạo mới
  for (const shop of SHOPS) {
    const ownerId = ownerIds[shop.owner];
    const row = {
      owner_id: ownerId,
      name: shop.name,
      category: shop.category,
      description: shop.description,
      address: shop.address,
      district: shop.district,
      city: 'Hà Nội',
      location: `SRID=4326;POINT(${shop.lng} ${shop.lat})`,
      geofence_radius_m: 150,
      phone: OWNERS[shop.owner].phone,
      cover_url: `/photos/${shop.cover}-960.webp`,
      verification_status: 'verified' as const,
      is_active: true,
    };
    const { data: existing, error: findError } = await db
      .from('shops')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('name', shop.name)
      .maybeSingle();
    if (findError) throw new Error(`shops: ${findError.message}`);
    if (existing) check('update shop', await db.from('shops').update(row).eq('id', existing.id));
    else check('insert shop', await db.from('shops').insert(row));
  }

  // Lịch sử 60 ngày + số dư khởi tạo cho mỗi quán
  const reset = check(
    'fn_demo_reset',
    await db.rpc('fn_demo_reset', { p_days: 60, p_shop_balance: 2_000_000 }),
  );

  const [{ count: shifts }, { count: bookings }] = await Promise.all([
    db.from('shifts').select('*', { count: 'exact', head: true }),
    db.from('bookings').select('*', { count: 'exact', head: true }),
  ]);
  console.log(
    `Xong: ${OWNERS.length} chủ quán, ${WORKERS.length} người làm, 1 admin, ${SHOPS.length} quán; ` +
      `${shifts} ca và ${bookings} booking lịch sử; reset = ${JSON.stringify(reset)}`,
  );
  console.log(
    'Đăng nhập nhanh: ' +
      Object.values(DEMO_ACCOUNTS)
        .map((a) => a.email)
        .join(', '),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
