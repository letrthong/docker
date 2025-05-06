import subprocess

def get_current_commit_hash():
    result = subprocess.run(['git', 'rev-parse', 'HEAD'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode == 0:
        return result.stdout.strip()
    else:
        return None

commit_hash = get_current_commit_hash()
if commit_hash:
    print(f"Current commit hash: {commit_hash}")
else:
    print("Failed to get the current commit hash.")
