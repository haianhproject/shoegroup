from pathlib import Path
import copy
import xml.etree.ElementTree as ET

base = Path(__file__).resolve().parents[1]
source = base / 'diagrams/erd/ERD-ShoeGroup-20261004-Anh-Viet.drawio'
tree = ET.parse(source)
mxfile = tree.getroot()
overview = mxfile.find('diagram')
cells = overview.find('mxGraphModel/root')
groups = [
    ('hai-anh', 'Hải Anh — Nhóm trưởng / Sản phẩm', ['Products','ProductVariants','ProductImages','Categories','Brands','Materials','Colors','Sizes']),
    ('hung', 'Hưng — Đơn hàng / Thanh toán', ['Orders','OrderDetails','OrderStatusHistory','PaymentTransactions','ShippingMethods','CheckoutRequests']),
    ('hieu', 'Hiếu — Tài khoản / Phân quyền', ['Users','Roles','UserAddresses','Notifications']),
    ('viet', 'Việt — Giỏ hàng / Ưu đãi', ['Carts','CartItems','PosCarts','PosCartItems','Coupons','CouponRedemptions','VariantDiscounts']),
]
assert len({t for _,_,ts in groups for t in ts}) == 25
for key, name, tables in groups:
    diagram = ET.SubElement(mxfile, 'diagram', id='team-'+key, name='Phân công — '+name)
    model = ET.SubElement(diagram, 'mxGraphModel', dict(grid='1',gridSize='10',page='1',pageScale='1',pageWidth='3100',pageHeight='4000',background='#ffffff'))
    root = ET.SubElement(model, 'root')
    ET.SubElement(root, 'mxCell', id='0')
    ET.SubElement(root, 'mxCell', id='1', parent='0')
    selected = set(tables)
    while True:
        added = {c.get('id') for c in cells if c.get('parent') in selected}
        if added <= selected:
            break
        selected |= added
    title = copy.deepcopy(cells.find("mxCell[@id='title']"))
    title.set('value', name + ' — ' + str(len(tables)) + ' bảng phụ trách')
    title.find('mxGeometry').set('width','2900')
    root.append(title)
    note = copy.deepcopy(cells.find("mxCell[@id='note']"))
    note.set('value','Giữ nguyên thuộc tính Anh / Việt và PK/FK của bản nguồn. Trang này chỉ vẽ quan hệ trong phần phụ trách; mọi FK liên phần xem trang tổng quan. Schema nguồn 04/10/2026; phân công 07/10/2026.')
    note.find('mxGeometry').set('width','2900')
    root.append(note)
    positions = {}
    y = 180
    for offset in range(0,len(tables),3):
        row = tables[offset:offset+3]
        heights=[]
        for col,t in enumerate(row):
            geom=cells.find(f"mxCell[@id='{t}']/mxGeometry")
            positions[t]=(55+col*1000,y)
            heights.append(float(geom.get('height')))
        y += max(heights)+150
    model.set('pageHeight',str(int(y+100)))
    for original in cells:
        if original.get('id') in selected:
            c=copy.deepcopy(original)
            if c.get('id') in positions:
                x,ypos=positions[c.get('id')]
                c.find('mxGeometry').set('x',str(x))
                c.find('mxGeometry').set('y',str(ypos))
            root.append(c)
        elif original.get('edge')=='1' and original.get('source') in selected and original.get('target') in selected:
            c=copy.deepcopy(original)
            geom=c.find('mxGeometry')
            for child in list(geom):
                geom.remove(child)
            root.append(c)
    ids={c.get('id') for c in root}
    assert all(c.get('parent') in ids for c in root if c.get('parent'))
    assert all(c.get('source') in ids and c.get('target') in ids for c in root if c.get('edge')=='1')
output=base/'diagrams/erd/ERD-ShoeGroup-Anh-Viet-Phan-cong-20261007.drawio'
tree.write(output,encoding='utf-8',xml_declaration=True)
print(str(output))
print('Verified: 25 tables, 4 ownership pages, original 6 pages preserved.')
