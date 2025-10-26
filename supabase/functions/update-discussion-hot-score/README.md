# Supabase Edge Function: 更新 Discussion Hot Score

这个 Edge Function 用于定期更新讨论的热度分数。

## 功能特性

- **自动调度**: 每天自动执行
- **智能更新**: 只更新超过 8 小时未更新的 discussion
- **自动计算**: 触发数据库触发器自动重新计算 hot_score
- **错误处理**: 单个 discussion 失败不影响其他
- **详细日志**: 提供完整的执行日志

## 部署步骤

### 1. 部署 Edge Function

```bash
# 部署 Edge Function
supabase functions deploy update-discussion-hot-score

# 设置环境变量（如果还没有设置）
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. 配置定时调度

Edge Function 已经配置了每天执行的 cron 表达式：`0 0 * * *`（每天午夜执行）

### 3. 手动测试

可以通过以下方式手动触发：

```bash
# 或通过 API
curl -X POST http://localhost:54321/functions/v1/update-discussion-hot-score \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## 更新逻辑

1. **获取讨论**: 查询 `updated_at` 超过 8 小时的 discussion
2. **触发更新**: 更新 `updated_at` 字段
3. **自动计算**: 数据库触发器自动重新计算 `hot_score`
4. **批量处理**: 处理所有符合条件的 discussion

## 返回结果

```json
{
  "success": true,
  "message": "Hot score update completed",
  "updated": 10,
  "total": 10,
  "timestamp": "2024-12-01T12:00:00.000Z"
}
```

## 监控和日志

- 在 Supabase Dashboard 的 Edge Functions 页面查看执行日志
- 每次执行都会记录详细的处理过程
- 可以通过日志监控更新状态

## 注意事项

1. **权限**: 使用服务角色密钥，具有完整的数据库访问权限
2. **时间范围**: 只更新超过 8 小时的讨论，避免频繁更新
3. **自动计算**: 依赖数据库触发器自动计算 hot_score
4. **性能**: 对于大量 discussion 可能需要较长时间执行

## 故障排除

### 常见问题

1. **权限错误**: 确保设置了正确的 `SUPABASE_SERVICE_ROLE_KEY`
2. **数据库连接失败**: 检查 Supabase 项目状态
3. **定时任务未执行**: 检查 cron 表达式配置
4. **部分 discussion 失败**: 查看详细日志确定具体原因

### 调试方法

```bash
# 查看 Edge Function 日志
supabase functions logs update-discussion-hot-score

# 本地测试
supabase functions serve update-discussion-hot-score
```
