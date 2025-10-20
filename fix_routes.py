#!/usr/bin/env python3
"""Fix routes.ts by moving marketing routes inside registerRoutes function"""

# Read the file
with open('server/routes.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where processProjectAsync function ends (around line 3894)
process_async_end = None
for i in range(3890, 3900):
    if i < len(lines) and lines[i].strip() == '}':
        process_async_end = i + 1
        break

if not process_async_end:
    print("Could not find end of processProjectAsync")
    exit(1)

print(f"Found processProjectAsync end at line {process_async_end}")

# Everything from processProjectAsync end to end of file is the marketing routes
marketing_routes = lines[process_async_end:]

# Remove marketing routes from end
lines_without_marketing = lines[:process_async_end]

# Find where to insert (before "const httpServer = createServer")
insert_point = None
for i, line in enumerate(lines_without_marketing):
    if 'const httpServer = createServer(app);' in line:
        insert_point = i
        break

if not insert_point:
    print("Could not find httpServer creation")
    exit(1)

print(f"Found insert point at line {insert_point}")

# Insert marketing routes before httpServer
final_lines = lines_without_marketing[:insert_point] + marketing_routes + ['\n'] + lines_without_marketing[insert_point:]

# Write the fixed file
with open('server/routes.ts', 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print("✅ Fixed routes.ts - marketing routes moved inside registerRoutes function")
