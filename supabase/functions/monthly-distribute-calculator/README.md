# Supabase Edge Function: 每月自动计算 Distribute

这个 Edge Function 用于每月自动计算所有活跃 copany 的 distribute 分配。

## 功能特性

- **自动调度**: 每月 10 号自动执行
- **批量处理**: 处理所有活跃的 copany
- **完整逻辑**: 包含交易计算、贡献分数计算、按比例分配
- **错误处理**: 单个 copany 失败不影响其他 copany
- **详细日志**: 提供完整的执行日志

## 部署步骤

### 1. 部署 Edge Function

```bash
# 部署 Edge Function
supabase functions deploy monthly-distribute-calculator

# 设置环境变量（如果还没有设置）
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. 配置定时调度

Edge Function 已经配置了每月 10 号执行的 cron 表达式：`0 0 0 10 * *`

### 3. 手动测试

可以通过以下方式手动触发：

```bash
# 使用 Supabase CLI
supabase functions invoke monthly-distribute-calculator

# 或通过 API
curl -X POST https://your-project.supabase.co/functions/v1/monthly-distribute-calculator \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## 计算逻辑

1. **获取 copany**: 查询所有 copany
2. **时间范围**: 当前月份（UTC 时间）
3. **交易计算**:
   - 获取当月 10 号 0 点前已确认的收入和支出交易
   - 计算净收入 = 总收入 - 总支出
4. **贡献分数计算**:
   - 获取当月 1 号 0 点完成的 issue
   - 根据 issue 等级计算贡献分数
5. **按比例分配**:
   - 根据贡献分数按比例分配净收入
   - 生成 distribute 记录

## 返回结果

```json
{
  "success": true,
  "message": "Monthly distribute calculation completed",
  "timestamp": "2024-01-10T00:00:00.000Z",
  "results": [
    {
      "copanyId": "123",
      "copanyName": "Example Copany",
      "success": true,
      "message": "Distribute calculation completed",
      "netIncome": 1000.0,
      "inserted": 5
    }
  ]
}
```

## 监控和日志

- 在 Supabase Dashboard 的 Edge Functions 页面查看执行日志
- 每次执行都会记录详细的处理过程
- 可以通过日志监控每个 copany 的处理状态

## 注意事项

1. **权限**: 使用服务角色密钥，具有完整的数据库访问权限
2. **时区**: 所有时间计算使用 UTC 时区
3. **错误处理**: 单个 copany 处理失败不会影响其他 copany
4. **数据安全**: 会删除现有的 distribute 记录后重新生成
5. **性能**: 对于大量 copany 可能需要较长时间执行

## 故障排除

### 常见问题

1. **权限错误**: 确保设置了正确的 `SUPABASE_SERVICE_ROLE_KEY`
2. **数据库连接失败**: 检查 Supabase 项目状态
3. **定时任务未执行**: 检查 cron 表达式配置
4. **部分 copany 失败**: 查看详细日志确定具体原因

### 调试方法

```bash
# 查看 Edge Function 日志
supabase functions logs monthly-distribute-calculator

# 本地测试
supabase functions serve monthly-distribute-calculator
```
