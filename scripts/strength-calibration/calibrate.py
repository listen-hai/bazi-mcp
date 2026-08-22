# -*- coding: utf-8 -*-
# 千里命稿扶抑计分法 —— 权重校准与验证（单文件，可整体复跑）
# 用法: python3 calib.py
# 预期输出: 网格总数 10368 / 通过 172 / 选定参数下拟合集11例+留出集9例逐盘分数
import itertools

# ---- 表（镜像 @openfate/bazi-engine BRANCH_HIDDEN_STEMS；巳序按 dual-axis.ts 归一化 丙庚戊）----
HID = {
 '子':[('癸',0)],'丑':[('己',0),('癸',1),('辛',2)],'寅':[('甲',0),('丙',1),('戊',2)],
 '卯':[('乙',0)],'辰':[('戊',0),('乙',1),('癸',2)],'巳':[('丙',0),('庚',1),('戊',2)],
 '午':[('丁',0),('己',1)],'未':[('己',0),('丁',1),('乙',2)],'申':[('庚',0),('壬',1),('戊',2)],
 '酉':[('辛',0)],'戌':[('戊',0),('辛',1),('丁',2)],'亥':[('壬',0),('甲',1)]}
ELEM={'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'}
GEN={'木':'火','火':'土','土':'金','金':'水','水':'木'}
def helper(dm_e,e): return e==dm_e or GEN[e]==dm_e   # 同我 / 生我
SANHE={('申','子','辰'):'水',('寅','午','戌'):'火',('巳','酉','丑'):'金',('亥','卯','未'):'木'}
SANHUI={('寅','卯','辰'):'木',('巳','午','未'):'火',('申','酉','戌'):'金',('亥','子','丑'):'水'}
BANHE={('寅','午'):'火',('巳','酉'):'金',('申','子'):'水',('亥','卯'):'木'}  # 仅生旺半合

# ---- 计分（规格 §二 的算法本体）----
def score(pillars,P):
    ps=pillars.split(); stems=[p[0] for p in ps]; brs=[p[1] for p in ps]
    dme=ELEM[stems[2]]
    qw=[1.0,P['zhong'],P['yu']]; posm=[P['year'],P['month'],P['day'],P['hour']]
    def d(e): return 1.0 if helper(dme,e) else -P['k']
    s=0.0
    for i,(st,br) in enumerate(zip(stems,brs)):
        if i!=2: s+=P['stem']*d(ELEM[st])
        s+=posm[i]*sum(qw[q]*d(ELEM[h]) for h,q in HID[br])
    bs=set(brs)
    for tri,e in list(SANHE.items())+list(SANHUI.items()):
        if set(tri)<=bs: s+=P['ju']*d(e)
    for (a,b),e in BANHE.items():
        if a in bs and b in bs and not any(set(t)<=bs for t in list(SANHE)+list(SANHUI) if a in t and b in t):
            s+=P['ban']*d(e)
    return s

# ---- 拟合集：千里命稿11例（蒋为(c)共识、妻为(c)结构推断，其余(a)原文逐字）----
FIT=[('陆姓','癸未 甲子 丙戌 己亥'),('潘姓','壬子 癸丑 庚子 丁亥'),('陈姓','壬子 丙午 癸亥 戊午'),
     ('孙君','乙巳 戊子 乙巳 戊寅'),('金君','己亥 乙亥 丙戌 壬辰'),('悍匪','壬午 丙午 丙戌 庚寅'),
     ('荣宗敬','癸酉 庚申 戊午 甲寅'),('陆维屏','乙未 甲申 癸巳 丙辰'),('友人','乙巳 甲申 癸未 丙辰'),
     ('妻','癸酉 丁巳 辛丑 癸巳'),('蒋','丁亥 庚戌 己巳 庚午')]

def constraints_ok(r,t):
    # 明确盘: 稳健余量>=0.25；临界盘: 只约束方向/档带（依据见规格§三）
    clear=[(-r['陆姓']-t),(-r['潘姓']-t),(-r['金君']-t),(r['悍匪']-t),(r['妻']-t),(r['蒋']-t),(t-abs(r['孙君']))]
    if min(clear)<0.25: return None
    if r['潘姓']>=r['陆姓']: return None                       # 弱不堪言 < 以弱论
    if not(-t-1.0 < r['陈姓'] <= 0): return None               # 稍弱近中和
    if not(r['荣宗敬']>=0): return None                        # 身健=非弱
    if not(r['陆维屏']>r['友人'] and r['陆维屏']>0 and r['友人']<t): return None
    return min(clear)

GRID=dict(stem=[0.4,0.5,0.6,0.7], zhong=[0.4,0.5], yu=[0.2,0.3], year=[1.0],
          month=[2.0,2.5,3.0], day=[1.2,1.5], hour=[1.0], ju=[2.0,2.5,3.0],
          ban=[1.0,1.5,2.0], theta=[1.0,1.2,1.5], k=[0.45,0.5,0.55,0.6])

# ---- 选定参数（规格§二定死的那组，取整值、居于通过区域内）----
CHOSEN=dict(stem=0.6,zhong=0.5,yu=0.3,year=1.0,month=2.5,day=1.5,hour=1.0,ju=2.5,ban=1.5,theta=1.0,k=0.6)

# ---- 留出集：千里命稿9例，锁定参数验证，不参与网格约束 ----
HELD=[('王姓','己亥 癸酉 甲辰 丙寅','弱而有根/尚非至弱'),('詹姓','庚子 庚辰 甲子 戊辰','转弱为强'),
      ('马占山','乙酉 丁亥 己丑 甲子','弱(水盛)'),('吴佩孚','甲戌 戊辰 戊申 壬子','身财两美→强侧'),
      ('兰英史','辛丑 乙未 己亥 壬申','身主不弱'),('吴经熊','己亥 丁卯 乙未 己卯','曲直格→极强'),
      ('阮玲玉','庚戌 辛巳 己亥 乙亥','弱(印绶冲散;冲未建模,预期miss)'),
      ('颜惠庆','丁丑 癸卯 乙巳 丙子','得令未获气势之盛→中和~偏强'),
      ('交禄格','癸酉 庚申 壬子 辛亥','两行成象→极强')]

def label(s,t=1.0,dl=0.5):
    v='强' if s>=t else ('弱' if s<=-t else '中和')
    return v+('(临界)' if abs(abs(s)-t)<=dl else '')

if __name__=='__main__':
    keys=list(GRID); total=0; passed=[]
    for vals in itertools.product(*[GRID[kk] for kk in keys]):
        total+=1; P=dict(zip(keys,vals))
        r={n:score(pl,P) for n,pl in FIT}
        m=constraints_ok(r,P['theta'])
        if m is not None: passed.append((m,P))
    print(f'网格总数 {total} / 通过 {len(passed)} param sets pass')
    assert CHOSEN in [p for _,p in passed], '选定参数不在通过区域内!'
    print('\n-- 拟合集 @ 选定参数 --')
    for n,pl in FIT: s=score(pl,CHOSEN); print(f'{n:4s} {pl}  {s:+.2f}  {label(s)}')
    print('\n-- 留出集（锁定参数，未回调）--')
    for n,pl,exp in HELD: s=score(pl,CHOSEN); print(f'{n:4s} {pl}  {s:+.2f}  {label(s):10s} 书断:{exp}')
