window.PLAN = {
  slogan: "以实干筑基　向智能而行",
  contest: "第四届全国大学生职业规划大赛 · 成长赛道（高教组）",
  meta: "参赛选手 ~~~　　指导老师 ~~~　　参赛学校 广东白云学院",
  chapters: [
    {
      id: "origin",
      index: "01",
      name: "职业缘起",
      sentence: "从拆解好奇到软硬协同造物",
      image: "assets/origin-shoebox.jpg",
      alt: "用鞋盒纸箱自制机箱组装的电脑",
      ink: false,
      pages: [
        {
          id: "s2",
          kicker: "01",
          title: "01 职业缘起：把对电子的好奇，做成手中可用的作品",
          blocks: [
            { type: "lede", text: "从拆解好奇 → 动手装机 → 软硬协同造物。" },
            {
              type: "list",
              items: [
                { n: "童年阶段", title: "兴趣萌芽 · 探究设备内部构造", text: "拆开玩具与电脑查看内部结构，对电子元件如何协同工作产生强烈好奇，让兴趣有了最初的工程方向。" },
                { n: "初中阶段", title: "动手探索 · 纸箱机箱组装电脑", text: "用鞋盒纸箱自制机箱，自主研究主板接口与供电搭配，独立完成硬件组装与点亮开机，确立动手造物偏好。" },
                { n: "大学阶段", title: "作品落地 · 自制键盘与 AI 融合", text: "亲手做出可用的自制磁轴键盘带来巨大成就感；结合近一年 AI 工具使用经历，立志把硬件与智能能力结合。" }
              ]
            },
            {
              type: "gallery",
              items: [
                { src: "assets/origin-shoebox.jpg", alt: "用鞋盒纸箱自制机箱组装的电脑", caption: "初中实作：用鞋盒纸箱自制机箱，独立组装并点亮的整机电脑" },
                { src: "assets/self-keyboard.jpg", alt: "独立设计制作的自制磁轴键盘", caption: "大学实作：独立设计 PCB、焊接组装并点亮的自制磁轴键盘" }
              ]
            },
            {
              type: "role",
              name: "嵌入式 AI 开发工程师",
              note: "由此锚定我的核心职业目标（软硬协同 · 智能终端）。三阶主线：硬件固件筑基 → 云端 AI 接入 → 端侧模型推理。"
            },
            { type: "note", text: "内驱力转化 —— 从使用者蜕变为硬件与工具创造者。三段真实经历层层递进，让我锁定「软硬协同 + 智能终端」赛道。" }
          ]
        }
      ]
    },
    {
      id: "cognition",
      index: "02",
      name: "职业认知",
      sentence: "国家战略、校内平台与企业岗位",
      image: "assets/cognition-lab.jpg",
      alt: "广东白云学院嵌入式系统技术实验室实景",
      ink: false,
      pages: [
        {
          id: "s3",
          kicker: "02",
          title: "02 职业认知：国家『人工智能+』引航智能终端爆发",
          blocks: [
            { type: "lede", text: "政策依据 —— 国务院《关于深入实施「人工智能+」行动的意见》，国发〔2025〕11 号，2025 年 8 月发布。" },
            {
              type: "split",
              side: "left",
              shot: true,
              src: "assets/policy-crop.jpg",
              alt: "国务院人工智能+行动意见原文",
              text: "推动人工智能与经济社会各行业各领域深度融合，明确新一代智能终端为核心载体。",
              cite: "国务院国发〔2025〕11 号文件 · 2025 年 8 月"
            },
            {
              type: "metrics",
              items: [
                { value: "70", label: "2027 年阶段目标", text: "新一代智能终端、智能体等应用普及率超 70%。" },
                { value: "90", label: "2030 年远景目标", text: "智能终端与智能体应用普及率跨越式超 90%。" }
              ]
            },
            {
              type: "list",
              items: [
                { n: "01", title: "消费与交互智能终端", text: "大力发展智能机器人、智能家居、智能穿戴等新一代智能终端，重塑人机交互入口。" },
                { n: "02", title: "工业全要素智能化", text: "推进工业智能化，显著增强设备端的智能感知、实时分析决策与底层执行能力。" }
              ]
            },
            { type: "note", text: "我的战略落点 —— 锚定「AI + 智能终端」，服务智能硬件普及浪潮。以电路与嵌入式开发为基础，结合云端 AI 接入与设备端模型推理，把个人职业规划融入国家新一代智能终端产业升级大局。" }
          ]
        },
        {
          id: "s4",
          kicker: "02",
          title: "02 职业认知：立足广东白云学院四阶实训平台",
          blocks: [
            { type: "lede", text: "依托电气与信息工程学院实验平台与跨专业计算资源，打通「电路制作 → 控制开发 → 系统驱动 → 端侧部署」四级工程训练阶梯，把课堂理论转化为岗位实操能力。" },
            {
              type: "media",
              src: "assets/cognition-lab.jpg",
              alt: "广东白云学院嵌入式系统技术实验室实景",
              caption: "实景：广东白云学院嵌入式系统技术实验室"
            },
            {
              type: "list",
              items: [
                { n: "阶梯 01", title: "电路制作", text: "电工电子及电子线路综合实验室。设备：电子实验教学平台；支撑：测量、焊接与电路制作。" },
                { n: "阶梯 02", title: "控制开发", text: "微处理器原理与应用实验室。设备：STM32 实验箱、FPGA 板；支撑：控制与逻辑开发。" },
                { n: "阶梯 03", title: "驱动与交互设计", text: "嵌入式系统技术实验室。设备：S5P6818 实验箱；支撑：Linux 驱动与界面开发。" },
                { n: "阶梯 04", title: "端侧部署", text: "深度学习实验室（跨专业）。设备：GPU 服务器；支撑：跨专业探索模型训练与端侧部署。" }
              ]
            },
            { type: "note", text: "来源：广东白云学院电气与信息工程学院实验教学中心、大数据与计算机学院实验室公开资料。" }
          ]
        },
        {
          id: "s5",
          kicker: "02",
          title: "02 职业认知：对标乐鑫科技岗位，拆解复合能力",
          blocks: [
            { type: "lede", text: "企业样本 —— 乐鑫科技（Espressif）智能终端 + AIoT。官方校招原件，覆盖原理图/PCB、ESP32 与 AI 场景。" },
            {
              type: "list",
              items: [
                { n: "01", title: "嵌入式开发（应用方案）· 软硬协同", text: "参与原理图、PCB 与嵌入式软件开发，面向 AI 与交互场景完成方案验证与原型落地。要求掌握 C/C++、MCU/SoC、RTOS/Linux 与接口；理解语音/视觉、边缘计算与 LLM Agent 应用链路。" },
                { n: "02", title: "嵌入式软件开发（M5Stack）· 固件开发", text: "面向 ESP32 开发嵌入式与物联网应用方案。要求掌握 C/C++、原理图阅读、FreeRTOS 与接口，同时熟悉 Python 工具脚本与网络通信协议。" }
              ]
            },
            {
              type: "split",
              side: "left",
              shot: true,
              srcs: ["assets/job-crop-1.jpg", "assets/job-crop-2.jpg"],
              src: "assets/job-crop-1.jpg",
              alt: "乐鑫科技校招任职要求原文",
              text: "两岗共性提炼：AIoT 工程师三维能力靶标 —— ① 硬件：原理图/PCB　② 固件：C/RTOS　③ 智能：Python/AI。以此真实企业标准为标尺，开启自我能力盘点与人岗差距诊断。",
              cite: "乐鑫信息科技（上海）股份有限公司（Espressif Systems）公开招聘信息"
            }
          ]
        }
      ]
    },
    {
      id: "self",
      index: "03",
      name: "自我认知",
      sentence: "兴趣有方向，实践有回应",
      image: "assets/practice-glow.jpg",
      alt: "点亮蓝光的自制磁轴键盘",
      ink: false,
      pages: [
        {
          id: "s6",
          kicker: "03",
          title: "03 自我认知：省一流专业筑底，核心实践课优异",
          blocks: [
            { type: "lede", text: "广东白云学院省级一流专业 —— 电子信息工程。培养体系覆盖电路、信号、微处理器与嵌入式系统，强化理实一体训练。" },
            {
              type: "metrics",
              items: [
                { value: "96", label: "电子工艺实习", text: "实习项目。" },
                { value: "91", label: "电气接线工艺训练", text: "实训项目。" },
                { value: "94", label: "电子线路案例设计", text: "专业平台课 · 理论课。" }
              ]
            },
            {
              type: "split",
              side: "left",
              shot: true,
              src: "assets/grade-strips.png",
              alt: "三门核心课程成绩单裁切",
              text: "现阶段优势：动手落地强。在电子工艺、硬件接线与案例设计中表现突出；结合原理图、PCB 与焊接实操，能快速把想法做成可用作品。\n下一步进阶：向原理深耕。从「会连接、能完成」迈向「懂原理、能计算、会验证」，重点补强电路与数理定量推导，筑牢研发理论底座。",
              cite: "广东白云学院教务系统个人课程成绩单与电子信息工程专业培养方案"
            }
          ]
        },
        {
          id: "s7",
          kicker: "03",
          title: "03 自我认知：霍兰德 RIA 特质契合嵌入式研发",
          blocks: [
            { type: "lede", text: "霍兰德职业兴趣前三高分维度 —— R 84、I 84、A 70。" },
            {
              type: "metrics",
              items: [
                { value: "84", label: "R 现实型", text: "动手落地与硬件验证。" },
                { value: "84", label: "I 研究型", text: "原理探究与文档钻研。" },
                { value: "70", label: "A 艺术型", text: "结构巧思与交互体验。" }
              ]
            },
            {
              type: "list",
              items: [
                { n: "R 84", title: "R 现实型（84）· 动手落地与硬件验证", text: "喜欢动手制作和调试验证，愿意把想法一步步落到能用的电路与实体设备上；驱动我独立完成磁轴键盘 PCB 设计与焊接组装。" },
                { n: "I 84", title: "I 研究型（84）· 原理探究与文档钻研", text: "遇到问题主动查资料、看官方数据手册并比较方案，希望在弄清底层原理后再动手；支撑我攻克磁轴 RT 算法与 MCP 开发。" },
                { n: "A 70", title: "A 艺术型（70）· 结构巧思与交互体验", text: "关注外观结构与使用体验，思考同一块硬件适应更多场景；启发我用药瓶盖改造旋钮，并规划「音游 → 办公 → AI」演进。" }
              ]
            },
            { type: "note", text: "结论：人职匹配 —— R 支撑硬件实操落地，I 驱动底层原理深究，A 赋予产品交互巧思，高度契合嵌入式 AI 研发要求。" },
            { type: "note", text: "来源：个人霍兰德职业兴趣量表（SDS）标准测评报告（R=84, I=84, A=70）。" }
          ]
        },
        {
          id: "s8",
          kicker: "03",
          title: "03 目标定位与差距：软硬协同三阶路线与诊断",
          blocks: [
            { type: "lede", text: "本科毕业规划 —— 以高质量就业为主。" },
            {
              type: "role",
              name: "嵌入式 AI 开发工程师",
              note: "毕业去向：本科毕业以就业为主，聚焦智能终端与 AIoT 应用研发。"
            },
            {
              type: "list",
              items: [
                { n: "01", title: "硬件固件 · 打牢共同基础", text: "电路、C/C++、外设接口与 RTOS。完成设备输入、控制与反馈并用测试检验功能（已具备初步 PCB 与 C 固件基础）。" },
                { n: "02", title: "云端接入 · 连接 AI 服务", text: "从电脑端协同走向联网智能终端。从键盘触发电脑端工具与开发 MCP 起步，学习请求、响应与结果展示并记录响应时间。" },
                { n: "03", title: "端侧推理 · 让模型在设备上运行", text: "适配 MCU 轻量推理验证。在 MCU/ESP32 上验证轻量语音或识别模型，结合效果、延迟、内存与功耗评估。" }
              ]
            },
            {
              type: "list",
              items: [
                { n: "差距①", title: "电路/数理推导偏弱", text: "破局：用自研 MCP + Obsidian 建错题闭环。" },
                { n: "差距②", title: "复杂固件经验不足", text: "破局：自制 O3C 磁轴键盘研发与三场景迭代。" },
                { n: "差距③", title: "AI 协议经验欠缺", text: "破局：开发学习通 MCP 服务端并开源 GitHub。" }
              ]
            },
            { type: "note", text: "人岗差距诊断与破局行动一一对照，对应下一章的两项实践。" }
          ]
        }
      ]
    },
    {
      id: "practice",
      index: "04",
      name: "学习实践",
      sentence: "从一块键盘到一套 AI 工具链",
      image: "assets/keyboard-top.png",
      alt: "磁轴小键盘俯视图",
      ink: false,
      pages: [
        {
          id: "s9",
          kicker: "04",
          title: "04 学习实践：独立完成 O3C 键盘硬件与结构巧思",
          blocks: [
            { type: "lede", text: "项目一 —— 自制 O3C 霍尔磁轴小键盘。独立完成原理图（上）与双面 PCB 布局（下）。" },
            {
              type: "gallery",
              items: [
                { src: "assets/practice-schematic.png", alt: "键盘原理图", caption: "原理图 · 本人绘制", shot: true },
                { src: "assets/practice-pcb-red.png", alt: "红色 PCB 顶面", caption: "红色 PCB 顶面" },
                { src: "assets/practice-pcb-blue.png", alt: "蓝色 PCB 底面", caption: "蓝色 PCB 底面" }
              ]
            },
            {
              type: "media",
              src: "assets/practice-side.jpg",
              alt: "键盘实物侧视与药瓶盖旋钮",
              caption: "实物侧视：定位板 + 药瓶盖旋钮"
            },
            {
              type: "list",
              items: [
                { n: "01", title: "EDA 全流程", text: "熟练掌握嘉立创 EDA、AD，独立完成原理图与 PCB。" },
                { n: "02", title: "手册核验", text: "参考 O3C 布局，结合 AI 选型并查阅官方手册核对。" },
                { n: "03", title: "材料复用", text: "用 10×10cm 板材余量做定位板，药瓶盖做旋钮帽。" }
              ]
            },
            { type: "note", text: "全部原理图、PCB 与实物照片均为本人独立设计制作成果。" }
          ]
        },
        {
          id: "s10",
          kicker: "04",
          title: "04 学习实践：以规范方法开发 C 固件，攻克 RT 触发",
          blocks: [
            { type: "lede", text: "Pico SDK + C · Rapid Trigger（RT）。" },
            {
              type: "gallery",
              items: [
                { src: "assets/firmware-mindmap.png", alt: "功能思维导图", caption: "写前理架构 · 功能思维导图", shot: true },
                { src: "assets/firmware-code.png", alt: "RT 核心 C 代码", caption: "写中留注释 · RT 核心 C 代码" },
                { src: "assets/firmware-log.png", alt: "每周开发日志", caption: "每周记日志 · 进度与调试记录", shot: true }
              ]
            },
            {
              type: "list",
              items: [
                { n: "01", title: "写前理架构", text: "开发前先梳理模块关系，把采样、滤波、按键状态机与屏幕交互拆解清楚，避免盲目堆砌代码。" },
                { n: "02", title: "写中留注释", text: "实现 RT（快速触发）核心逻辑，关键算法均留详细注释，方便后期迭代。" },
                { n: "03", title: "每周记日志", text: "坚持每周编写开发日志跟进进度，在调试霍尔传感器模拟量与按键状态切换中吃透底层硬件响应原理（结合 AI 辅助答疑加速排错）。" }
              ]
            },
            { type: "note", text: "写前思维导图梳理 → 写中核心算法留注释 → 每周日志复盘排错。" }
          ]
        },
        {
          id: "s11",
          kicker: "04",
          title: "04 学习实践：同一块硬件拓展三大交互场景",
          blocks: [
            { type: "lede", text: "一机三用 —— 音游外设 → 办公宏键盘 → AI 协作入口。已有基础：自制磁轴小键盘已能稳定用于高频输入；后期迭代：让同一块硬件延伸服务办公与桌面 AI 协同。" },
            {
              type: "media",
              src: "assets/practice-glow.jpg",
              alt: "亮起背光的自制磁轴小键盘"
            },
            {
              type: "list",
              items: [
                { n: "01", title: "音游模式 · 已有场景 · 已稳定投入使用", text: "已能正常用于音游高频按键操作，验证了硬件电路与底层 RT 固件的稳定性；后期持续完善触发自定义与响应体验。" },
                { n: "02", title: "工作模式 · 拟开发 · 日常高频生产力工具", text: "面向复制、粘贴、撤销、编译调试等高频日常操作，支持自定义快捷宏按键与多套预设配置一键切换。" },
                { n: "03", title: "AI 协作 · 拟开发 · 桌面 AI 软硬协同入口", text: "一键查看多个 AI 协同工作进度或快捷呼出 AI 助手，支持语音输入触发；AI 推理交由电脑端完成，键盘专注输入与状态切换，率先跑通「硬件外设 + 桌面 AI」协同原型。" }
              ]
            },
            { type: "note", text: "以真实使用需求驱动硬件固件持续迭代。" }
          ]
        },
        {
          id: "s12",
          kicker: "04",
          title: "04 学习实践：自主开发学习通 MCP 并开源 GitHub",
          blocks: [
            { type: "lede", text: "项目二 —— GitHub · @MicroYume/superstar-checker。" },
            {
              type: "gallery",
              items: [
                { src: "assets/mcp-repo.png", alt: "GitHub 开源仓库界面", caption: "仓库结构 · 4 次提交" },
                { src: "assets/mcp-readme.png", alt: "README 文档说明", caption: "README · 纯 HTTP 架构，无需浏览器自动化" }
              ]
            },
            {
              type: "list",
              items: [
                { n: "01", title: "起因：课程通知与作业查找耗时", text: "通知和作业分散在收件箱与多层目录中，复习时需逐个翻找、待办任务也需反复人工核对，效率低下。" },
                { n: "02", title: "想法：将查询能力接入 AI", text: "构思开发学习通 MCP 服务端，让 AI 直接调用接口查询通知和作业、提取习题并自动整理为笔记。" },
                { n: "03", title: "实现并开源至 GitHub", text: "借助 AI 边学边开发：先定数据结构再协同编码，定向掌握 Python、HTTP 请求与 MCP 协议。" }
              ]
            },
            { type: "note", text: "开源仓库地址 github.com/MicroYume/superstar-checker。" }
          ]
        },
        {
          id: "s13",
          kicker: "04",
          title: "04 学习实践：串联 AI 与 Obsidian 反哺理论学习",
          blocks: [
            { type: "lede", text: "三大实际成效 —— ① 任务看得清（省去翻找）　② 习题留得住（本地归档）　③ 错题有反馈（把精力留给原理与独立解题）。" },
            {
              type: "list",
              items: [
                { n: "步骤 01", title: "查询并整理课程作业", text: "任务看得清。调用 MCP 自动盘点未交作业与剩余时长，按紧急度智能排序并提示隐性截止风险，告别人工翻找。" },
                { n: "步骤 02", title: "提取习题转 Markdown", text: "习题留得住。自动拉取学习通章节测验，转为标准格式存入 Obsidian 知识库，随时检索、永久留存。" },
                { n: "步骤 03", title: "结合 Obsidian 重做习题", text: "检验真懂。不再停留在「看懂答案」，通过二次独立重做检验电路与数理公式推导是否真正扎实掌握。" },
                { n: "步骤 04", title: "AI 错题讲解与整理笔记", text: "错题有反馈。针对卡点让 AI 拆解底层原理，将易错点沉淀为结构化笔记，精准攻克「重实操轻理论推导」的能力差距。" }
              ]
            },
            {
              type: "gallery",
              items: [
                { src: "assets/mcp-tasks.png", alt: "待办汇总与缓急排序", caption: "待办汇总与缓急排序" },
                { src: "assets/mcp-note.jpg", alt: "Obsidian 结构化题库归档", caption: "结构化题库归档", shot: true }
              ]
            },
            { type: "note", text: "用工程化 AI 工具链反哺专业课理论学习与错题复测。" }
          ]
        }
      ]
    },
    {
      id: "review",
      index: "05",
      name: "评估优化",
      sentence: "三年一阶，动态校准",
      image: "assets/closing-sky.jpg",
      alt: "黄昏海面上远行的帆船",
      ink: true,
      pages: [
        {
          id: "s14",
          kicker: "05",
          title: "05 评估优化：2026—2033 三阶成长路线图",
          blocks: [
            { type: "lede", text: "以清晰的三年一阶里程碑，引领从在校生到资深研发工程师的进阶。" },
            {
              type: "list",
              items: [
                { n: "2026—2027", title: "短期目标（2026—2027）· 夯实理论，验证基本功", text: "筑牢数理与电路之基：梳理数学与电路核心概念，整理错题与薄弱点，每月选同类题目独立复测；聚焦瓶颈与以做促学：整理自制键盘功能与操作步骤，逐项记录预期、实测结果与代码修改内容；教师指导与理实互促：跟进课内实验，遇到原理与设计难点及时向教师请教方案与测试方法。" },
                { n: "2028—2029", title: "中期目标（2028—2029）· 对照岗位，完成系统作品", text: "补齐接口、RTOS 与联网：深入学习 C/C++、ESP32 与 RTOS，完成多外设通信、任务调度与无线联网实验；云端接入与端侧验证：跑通 AI 请求与响应，在适配 MCU 上验证轻量模型，记录识别效果与端到端延迟；进入企业一线实习检验：争取嵌入式/硬件实习并完成毕设，根据导师与企业反馈动态调整后续学习计划。" },
                { n: "2030—2033", title: "长期目标（2030—2033）· 立足模块，参与系统设计", text: "独立负责核心模块开发：跟资深工程师学习工程规范，独立完成模块需求、开发、调试与测试交付全流程；攻克嵌入式 AI 落地难题：统筹「性能 + 功耗 + 成本控制」平衡，协同团队落地云端、端侧或端云协同量产方案；沉淀标准化工程经验：整理模块接口文档与典型调试案例，在团队协作中逐步向资深嵌入式 AI 专家成长。" }
              ]
            }
          ]
        },
        {
          id: "s15",
          kicker: "05",
          title: "05 评估优化：三维动态校准机制与实践复盘",
          blocks: [
            { type: "lede", text: "复盘反思闭环 —— 有据可查、动态纠偏。" },
            {
              type: "list",
              items: [
                { n: "01", title: "01 理论学习评估 · 独立解题检验", text: "评估依据：课程总结、独立解题记录与错题复盘；已发生复盘：发现自身动手快但理论计算偏弱，立即用自研 MCP + Obsidian 建立错题归档与二次独立重做闭环；短期筑基校准：结合错题明确重点，每月底复盘电路与数理错题，筛选未完全吃透的定理，动态调整下月自习权重，安排同类题独立复测直至达标。" },
                { n: "02", title: "02 项目实践评估 · 逐项测试记录", text: "评估依据：功能清单、测试记录、问题日志与版本资料；已发生复盘：从单一音游键盘起步，通过每周调试日志迭代 RT 滤波算法，并拓展规划工作模式与 AI 协作模式；中期攻关校准：在 ESP32/MCU 验证中，若端侧模型延迟或内存超限，则灵活调整为「端侧唤醒 + 云端/PC 推理」协同架构。" },
                { n: "03", title: "03 职业认知评估 · 岗位样本对标", text: "评估依据：企业招聘要求、教师建议与实习实践反馈；已发生复盘：对照乐鑫科技真实岗位要求，发现 AI 协议能力缺口，主动自学 Python 与 MCP 完成开源项目破局；长期实战校准：每学期追踪智能终端龙头企业新发布的芯片与工具链，结合实习导师反馈更新能力清单与攻关顺序，保持动态适配。" }
              ]
            },
            { type: "note", text: "在行动中发现问题、在复盘中迭代方案，实现螺旋式成长。" }
          ]
        }
      ]
    }
  ],
  close: {
    id: "close",
    title: "以实干筑基　向智能而行",
    line: "让实践的热情，生长为有理论支撑的工程能力 · 让技术回应真实需求",
    words: ["硬件固件", "云端接入", "端侧推理"],
    thanks: "感谢各位专家评委老师批评指导",
    sign: "广东白云学院　2025 级电子信息工程专业（省级一流专业）",
    image: "assets/wiring.jpg",
    alt: "键盘内部的接线"
  }
};
