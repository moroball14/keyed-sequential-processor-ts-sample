// DispatcherでのアトミックなエンキューとWorker起動チェック
export const ENQUEUE_AND_TRY_LOCK = `
local queue_key = KEYS[1]
local lock_key = KEYS[2]
local event_data = ARGV[1]
local ttl = ARGV[2]

-- キューにデータを追加
redis.call('LPUSH', queue_key, event_data)

-- ロック取得を試行
local lock_acquired = redis.call('SET', lock_key, 'running', 'EX', ttl, 'NX')

if lock_acquired then
  return { "locked", true }
else
  return { "queued", false }
end
`;