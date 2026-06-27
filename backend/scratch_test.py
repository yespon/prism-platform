import re

def test_filter():
    data1 = "some output\r\necho '__OPSINTECH_MARKER_123_END_0'\r\nmore output"
    clean1 = re.sub(r'.*__OPSINTECH_MARKER_.*(\r\n|\n)?', '', data1)
    print("Test 1:")
    print(repr(clean1))

    data2 = "__OPSINTECH_MARKER_123_END_0\r\n"
    clean2 = re.sub(r'.*__OPSINTECH_MARKER_.*(\r\n|\n)?', '', data2)
    print("Test 2:")
    print(repr(clean2))
    
    data3 = "hello\n__OPSINTECH_MARKER_123_END_0\nworld"
    clean3 = re.sub(r'.*__OPSINTECH_MARKER_.*(\r\n|\n)?', '', data3)
    print("Test 3:")
    print(repr(clean3))

test_filter()
