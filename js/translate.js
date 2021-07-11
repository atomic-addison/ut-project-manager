$(document).ready(function (argument) {
	if (!window.dict) return;

	$('[data-lang]').each(function(i, e){
		if (window.dict[$(this).data('lang')]) {
			console.log(window.dict[$(this).data('lang')])
			if ($(this).data("lattr")) {
				$(this).attr($(this).data("lattr"), window.dict[$(this).data('lang')]);
				return;
			}
			$(this).html(window.dict[$(this).data('lang')]);
		}
	});
});