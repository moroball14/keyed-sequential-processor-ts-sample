// アトミックなロック解放とキューチェックのためのLua Script
export const RELEASE_LOCK_AND_CHECK_QUEUE = `
local queue_key = KEYS[1]
local lock_key = KEYS[2]
local worker_url = ARGV[1]

-- キューの長さをチェック
local queue_length = redis.call('LLEN', queue_key)

if queue_length > 0 then
  -- キューにまだタスクがある場合、ロックはそのまま保持
  return { "continue", queue_length }
else
  -- キューが空の場合のみロックを解放
  redis.call('DEL', lock_key)
  return { "release", 0 }
end
`;