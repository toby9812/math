import sys

# Problem:
# Total candies: 24
# Per bag: 8
# Goal: bags, remainder

# Path A: Algebraic integer division and modulo
total = 24
per_bag = 8

q_A = total // per_bag
r_A = total % per_bag

# Path B: Simulation / Repeated subtraction
candies = total
bags_B = 0
steps = []
while candies >= per_bag:
    candies -= per_bag
    bags_B += 1
    steps.append((bags_B, candies))

r_B = candies

# Check agreement
assert q_A == bags_B, f"Disagreement in bags: {q_A} vs {bags_B}"
assert r_A == r_B, f"Disagreement in remainder: {r_A} vs {r_B}"
assert q_A * per_bag + r_A == total, "Reconstruction failed"
assert 0 <= r_A < per_bag, "Remainder out of range"

print(f"Path A: bags={q_A}, remainder={r_A}")
print(f"Path B: bags={bags_B}, remainder={r_B}")
print(f"Steps: {steps}")
print("MATCH: TRUE")
