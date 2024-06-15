with (open('style.css') as css,
      open('script.js') as js,
      open('chess.onefile.html', 'w') as f):
    f.write(f"""\
<style>
{css.read()}
</style>


<body></body>


<script>
{js.read()}
</script>""")
