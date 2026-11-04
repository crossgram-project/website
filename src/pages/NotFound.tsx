import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="container page-head">
      <h1>页面未找到</h1>
      <p className="lead">这个地址不存在，可能已经移动。</p>
      <p>
        <Link className="btn" to="/">
          返回首页
        </Link>
      </p>
    </div>
  )
}
