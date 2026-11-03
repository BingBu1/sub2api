# Zipkiwi 站点代理维护

## 移除旧 QQ 悬浮联系窗口

2026-11-04，按 Karl 要求移除先前通过 OpenResty 注入的 QQ 悬浮联系窗口。
该窗口独立于应用镜像：站点 `root.conf` 曾通过 `sub_filter` 把
`/zipkiwi-contact/contact-v1.js` 加入每个 HTML 页面，脚本再加载对应样式。
因此，本次改动属于站点代理配置，不需要重建应用镜像。

`remove_legacy_contact_widget.py` 精确移除这一段既有配置：

```nginx
    # Zipkiwi contact widget: same-origin assets, HTML responses only.
    proxy_set_header Accept-Encoding "";
    sub_filter_once on;
    sub_filter '</body>' '<script defer src="/zipkiwi-contact/contact-v1.js"></script></body>';
```

其余代理指令保持原样。后台 `contact_info`、首页现有联系方式及数据库内容不变。
旧静态 JS/CSS 和独立资源路由保留在服务器，但页面已不再引用它们。

### 执行方式

脚本只适用于本节记录的 Zipkiwi / 1Panel 部署。先检查目标路径、容器名和配置差异，
在服务器以 root 权限运行。默认只预览：

```sh
sudo python3 deploy/zipkiwi/remove_legacy_contact_widget.py
sudo python3 deploy/zipkiwi/remove_legacy_contact_widget.py --apply
```

应用时先检查源站首页和现有 Nginx 配置；原子替换配置后再次执行 `nginx -t`，
通过后才热加载。随后使用正确 SNI 访问本机 HTTPS 源站，确认首页返回 200、
应用挂载节点存在、旧窗口脚本不再出现。配置检查或源站验证失败时恢复内存中的原配置并热加载。
若发现并发修改则停止覆盖，交由维护人员检查。重复执行已移除的配置不会再次修改文件。

源站探测只连接 `127.0.0.1:443`；因为源站使用独立证书，这一局部检查不验证公开证书链。
公开域名的 HTTPS 访问应另行验证，不能以此代替公网证书检查。

### 本次上线记录

- 按 Karl 指定顺序：先修改并验证网站，再将操作脚本及说明提交到 GitHub。
- 应用镜像：`bingbu1/sub2api:2.16.0`，镜像提交 `7c7a45ddf0d490072a49a7910309e24afc94dc89`。
- 目标配置：`/opt/1panel/www/sites/zipkiwi.com/proxy/root.conf`。
- 修改前 SHA256：`9061003a95d13bd324cc02d2980d8fd45678f0e33a56480834774132d1d9a68c`。
- 修改后 SHA256：`a1c9372d5add213ed05e2db7399ad3fe1c79d167622f95db3e2bb5638e1641b1`。
- 验证：配置测试、热加载、源站首页、公网首页和登录页均通过；HTML 均已没有旧脚本引用。
- 本地逻辑检查：精确移除既有片段、重复运行无变化、拒绝未经识别的变体配置。

本次 Git 提交记录的是代理维护变更，因此新的仓库提交号与未重建的应用镜像提交号不同。
判断部署状态时应分别核对应用镜像提交和代理配置校验值。

### 恢复依据与备份约定

Karl 在本次修改前明确要求完成的 2026-11-04 00:18（香港时间）加密数据与设置备份，
已经包含原代理配置、窗口静态文件及相关站点配置。需要恢复旧窗口时，先核对当前代理配置，
再从该备份提取原片段进行定向恢复、配置测试和热加载；不要为恢复窗口而覆盖整个业务数据库。

本脚本不创建备份、启动定时任务或修改数据库。后续备份和同步仍须按 Karl 当次指令执行。
不得将真实 `.env`、恢复密钥、SSH 私钥或客户数据提交到仓库。
