# Button 组件使用指南

## 概述

Button 组件是一个可复用的按钮组件，支持多种变体和尺寸，统一了项目中的按钮样式。

## 属性

### variant (可选)

- `primary`: 主要按钮样式（默认）
- `secondary`: 次要按钮样式
- `ghost`: 幽灵按钮样式
- `danger`: 危险操作按钮样式

### size (可选)

- `sm`: 小尺寸按钮
- `md`: 中等尺寸按钮（默认）
- `lg`: 大尺寸按钮

### className (可选)

可以传入额外的 CSS 类名来自定义样式。

### 其他属性

支持所有标准的 HTML button 属性（type, disabled, onClick 等）。

## 使用示例

```tsx
import Button from "@/components/Button";

// 基本使用
<Button>默认按钮</Button>

// 不同变体
<Button variant="primary">主要按钮</Button>
<Button variant="secondary">次要按钮</Button>
<Button variant="ghost">幽灵按钮</Button>
<Button variant="danger">危险按钮</Button>

// 不同尺寸
<Button size="sm">小按钮</Button>
<Button size="md">中等按钮</Button>
<Button size="lg">大按钮</Button>

// 表单按钮
<Button type="submit" variant="primary">
  提交
</Button>

// 禁用状态
<Button disabled variant="primary">
  禁用按钮
</Button>

// 自定义样式
<Button className="mt-2 w-full" variant="primary">
  全宽按钮
</Button>
```

## 样式特点

- 支持深色模式
- 响应式设计
- 统一的悬停效果
- 禁用状态样式
- 平滑的过渡动画
